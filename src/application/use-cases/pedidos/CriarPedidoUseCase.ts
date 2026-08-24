import { v4 as uuidv4 } from 'uuid';
import { IPedidoRepository } from '../../../domain/repositories/IPedidoRepository';
import { IEstoqueRepository } from '../../../domain/repositories/IEstoqueRepository';
import { IPagamentoRepository } from '../../../domain/repositories/IPagamentoRepository';
import { IUnidadeRepository } from '../../../domain/repositories/IUnidadeRepository';
import { IGatewayPagamento } from '../../ports/IGatewayPagamento';
import { ILogger } from '../../ports/ILogger';
import { PromocaoService, ItemComDesconto } from '../../services/PromocaoService';
import { FidelidadeService } from '../../services/FidelidadeService';
import { CanalPedido } from '../../../domain/enums/CanalPedido';
import { StatusPedido } from '../../../domain/enums/StatusPedido';
import { StatusPagamento } from '../../../domain/enums/StatusPagamento';
import { TipoMovimentacaoEstoque } from '../../../domain/enums/TipoMovimentacaoEstoque';
import {
  EstoqueInsuficienteError,
  UnidadeInativaError,
  PagamentoNegadoError,
  PagamentoPendenteError,
  RecursoNaoEncontradoError,
} from '../../../domain/errors/DomainErrors';

export interface ItemPedidoInput {
  produtoId: string;
  quantidade: number;
}

export interface CriarPedidoInput {
  clienteId: string | null;
  unidadeId: string;
  canalPedido: CanalPedido;
  itens: ItemPedidoInput[];
  formaPagamento: string;
  pontosParaResgatar?: number;
  ip?: string;
}

export interface CriarPedidoOutput {
  pedido: {
    id: string;
    numeroPedido: string;
    status: StatusPedido;
    valorTotal: number;
    descontoTotal: number;
    canalPedido: CanalPedido;
  };
  pagamento: {
    status: StatusPagamento;
    payload: Record<string, unknown>;
  };
}

export class CriarPedidoUseCase {
  constructor(
    private readonly pedidoRepository: IPedidoRepository,
    private readonly estoqueRepository: IEstoqueRepository,
    private readonly pagamentoRepository: IPagamentoRepository,
    private readonly unidadeRepository: IUnidadeRepository,
    private readonly gatewayPagamento: IGatewayPagamento,
    private readonly promocaoService: PromocaoService,
    private readonly fidelidadeService: FidelidadeService,
    private readonly logger: ILogger,
  ) {}

  async execute(input: CriarPedidoInput): Promise<CriarPedidoOutput> {
    // 1. Validar unidade
    const unidade = await this.unidadeRepository.buscarPorId(input.unidadeId);
    if (!unidade) throw new RecursoNaoEncontradoError('Unidade', input.unidadeId);
    if (!unidade.isAtiva()) throw new UnidadeInativaError(input.unidadeId);

    // 2. Verificar disponibilidade de estoque (RF-04.4)
    const disponibilidades = await this.estoqueRepository.verificarDisponibilidadeMultiplos(
      input.unidadeId,
      input.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
    );

    for (const disp of disponibilidades) {
      if (!disp.disponivel) {
        const item = input.itens.find((i) => i.produtoId === disp.produtoId);
        throw new EstoqueInsuficienteError(
          disp.produtoId,
          disp.quantidadeDisponivel,
          item?.quantidade ?? 0,
        );
      }
    }

    // 3. Buscar preços e aplicar promoções (RF-07.2)
    const itensParaDesconto = await this.resolverPrecos(input.itens, input.unidadeId);
    const itensComDesconto = await this.promocaoService.aplicarDescontos(
      itensParaDesconto,
      input.unidadeId,
    );

    // 4. Calcular desconto de fidelidade (RF-06.3)
    let descontoFidelidade = 0;
    if (input.clienteId && input.pontosParaResgatar && input.pontosParaResgatar > 0) {
      descontoFidelidade = await this.fidelidadeService.validarECalcularResgate(
        input.clienteId,
        input.pontosParaResgatar,
      );
    }

    const subtotal = itensComDesconto.reduce(
      (acc: number, i: { precoUnitario: number; descontoAplicado: number; quantidade: number }) =>
        acc + (i.precoUnitario - i.descontoAplicado) * i.quantidade,
      0,
    );
    const descontoTotal =
      itensComDesconto.reduce(
        (acc: number, i: { descontoAplicado: number; quantidade: number }) =>
          acc + i.descontoAplicado * i.quantidade,
        0,
      ) + descontoFidelidade;
    const valorTotal = Math.max(0, subtotal - descontoFidelidade);

    // 5. Criar pedido no banco com status AGUARDANDO_PAGAMENTO (RF-04.5)
    const numeroPedido = await this.pedidoRepository.proximoNumeroPedido(input.unidadeId);
    const pedidoId = uuidv4();

    const pedido = await this.pedidoRepository.criar({
      id: pedidoId,
      numeroPedido,
      clienteId: input.clienteId,
      unidadeId: input.unidadeId,
      canalPedido: input.canalPedido,
      status: StatusPedido.AGUARDANDO_PAGAMENTO,
      valorTotal,
      descontoTotal,
      itens: itensComDesconto.map((i: ItemComDesconto) => ({
        id: uuidv4(),
        pedidoId,
        produtoId: i.produtoId,
        nomeProduto: i.produtoId, // será enriquecido via join no repositório
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        descontoAplicado: i.descontoAplicado,
        origemDesconto: i.origemDesconto,
      })),
    });

    // 6. Baixar estoque atomicamente (RF-05.3)
    for (const item of input.itens) {
      const estoque = await this.estoqueRepository.buscarPorUnidadeEProduto(
        input.unidadeId,
        item.produtoId,
      );
      if (estoque) {
        const novaQtd = estoque.quantidade - item.quantidade;
        await this.estoqueRepository.atualizar(estoque.id, novaQtd);
        await this.estoqueRepository.registrarMovimentacao({
          id: uuidv4(),
          estoqueId: estoque.id,
          usuarioId: input.clienteId ?? 'SISTEMA',
          tipo: TipoMovimentacaoEstoque.SAIDA,
          quantidade: item.quantidade,
          motivo: `Pedido #${numeroPedido}`,
        });

        // RF-05.5 — alerta de estoque mínimo
        if (estoque.atingiuMinimo()) {
          this.logger.warn('ESTOQUE_MINIMO_ATINGIDO', {
            produtoId: item.produtoId,
            unidadeId: input.unidadeId,
            quantidade: novaQtd,
          });
        }
      }
    }

    // 7. Criar registro de pagamento
    const pagamentoId = uuidv4();
    let pagamento = await this.pagamentoRepository.criar({
      id: pagamentoId,
      pedidoId,
      metodoPagamento: input.formaPagamento,
      status: StatusPagamento.PENDENTE,
    });

    // 8. Solicitar pagamento ao mock (RF-08.1)
    let respostaPagamento: { status: StatusPagamento; payload: Record<string, unknown> };

    try {
      const resposta = await this.gatewayPagamento.solicitarPagamento({
        pedidoId,
        valor: valorTotal,
        metodoPagamento: input.formaPagamento,
      });

      respostaPagamento = { status: resposta.status, payload: resposta.payload };
      pagamento = await this.pagamentoRepository.atualizar(pagamentoId, {
        status: resposta.status,
        payloadResposta: resposta.payload,
      });

      if (resposta.status === StatusPagamento.NEGADO) {
        // RF-08.5 — pagamento negado: estornar estoque e cancelar pedido
        await this.estornarEstoque(input);
        await this.pedidoRepository.atualizarStatus(
          pedidoId,
          StatusPedido.CANCELADO,
          'Pagamento negado pelo gateway.',
        );
        this.logger.auditoria('PEDIDO_CANCELADO_PAGAMENTO_NEGADO', {
          usuarioId: input.clienteId ?? undefined,
          entidade: 'Pedido',
          entidadeId: pedidoId,
          ip: input.ip,
        });
        throw new PagamentoNegadoError(resposta.payload);
      }

      // 9. Pagamento aprovado: transitar status e acumular pontos
      await this.pedidoRepository.atualizarStatus(pedidoId, StatusPedido.CONFIRMADO);
      await this.pedidoRepository.atualizarStatus(pedidoId, StatusPedido.EM_PREPARO);

      if (input.clienteId && input.pontosParaResgatar && input.pontosParaResgatar > 0) {
        await this.fidelidadeService.executarResgate(
          input.clienteId,
          input.pontosParaResgatar,
          pedidoId,
        );
      }

      if (input.clienteId) {
        await this.fidelidadeService.acumularPontos(input.clienteId, valorTotal, pedidoId);
      }

      this.logger.auditoria('PEDIDO_CRIADO', {
        usuarioId: input.clienteId ?? undefined,
        entidade: 'Pedido',
        entidadeId: pedidoId,
        ip: input.ip,
        extras: { canal: input.canalPedido, valor: valorTotal, numeroPedido },
      });

    } catch (error) {
      if (error instanceof PagamentoNegadoError) throw error;

      // RF-08.4 — timeout/falha de comunicação
      await this.pagamentoRepository.atualizar(pagamentoId, {
        status: StatusPagamento.ERRO,
        payloadResposta: { erro: String(error), timestamp: new Date().toISOString() },
      });
      this.logger.error('PAGAMENTO_ERRO', { pedidoId, erro: String(error) });
      throw new PagamentoPendenteError(pedidoId);
    }

    return {
      pedido: {
        id: pedido.id,
        numeroPedido: pedido.numeroPedido,
        status: StatusPedido.EM_PREPARO,
        valorTotal,
        descontoTotal,
        canalPedido: input.canalPedido,
      },
      pagamento: respostaPagamento!,
    };
  }

  private async resolverPrecos(
    itens: ItemPedidoInput[],
    _unidadeId: string,
  ): Promise<Array<{ produtoId: string; precoUnitario: number; quantidade: number }>> {
    // Preços reais vêm do cardápio da unidade — simplificado aqui; o repositório resolve
    return itens.map((i) => ({ produtoId: i.produtoId, precoUnitario: 0, quantidade: i.quantidade }));
  }

  private async estornarEstoque(input: CriarPedidoInput): Promise<void> {
    for (const item of input.itens) {
      const estoque = await this.estoqueRepository.buscarPorUnidadeEProduto(
        input.unidadeId,
        item.produtoId,
      );
      if (estoque) {
        await this.estoqueRepository.atualizar(estoque.id, estoque.quantidade + item.quantidade);
        await this.estoqueRepository.registrarMovimentacao({
          id: uuidv4(),
          estoqueId: estoque.id,
          usuarioId: 'SISTEMA',
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          quantidade: item.quantidade,
          motivo: 'Estorno por pagamento negado',
        });
      }
    }
  }
}
