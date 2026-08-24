import { IPedidoRepository } from '../../../domain/repositories/IPedidoRepository';
import { IEstoqueRepository } from '../../../domain/repositories/IEstoqueRepository';
import { ILogger } from '../../ports/ILogger';
import { StatusPedido } from '../../../domain/enums/StatusPedido';
import { TipoMovimentacaoEstoque } from '../../../domain/enums/TipoMovimentacaoEstoque';
import { Role } from '../../../domain/enums/Role';
import {
  RecursoNaoEncontradoError,
  PermissaoNegadaError,
  TransicaoStatusInvalidaError,
} from '../../../domain/errors/DomainErrors';
import { v4 as uuidv4 } from 'uuid';

export interface TransitarStatusInput {
  pedidoId: string;
  novoStatus: StatusPedido;
  roleRequisitante: Role;
  usuarioId: string;
  motivo?: string;
  ip?: string;
}

export class TransitarStatusPedidoUseCase {
  constructor(
    private readonly pedidoRepository: IPedidoRepository,
    private readonly estoqueRepository: IEstoqueRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: TransitarStatusInput): Promise<void> {
    const pedido = await this.pedidoRepository.buscarPorIdComItens(input.pedidoId);
    if (!pedido) throw new RecursoNaoEncontradoError('Pedido', input.pedidoId);

    // RF-04.7 — somente COZINHA pode mover para PRONTO
    if (
      input.novoStatus === StatusPedido.PRONTO &&
      !([Role.COZINHA, Role.GERENTE, Role.ADMIN] as Role[]).includes(input.roleRequisitante)
    ) {
      throw new PermissaoNegadaError('transitar pedido para PRONTO');
    }

    // RF-04.8 — somente ATENDENTE ou GERENTE pode marcar como ENTREGUE ou CANCELADO
    if (
      (input.novoStatus === StatusPedido.ENTREGUE ||
        input.novoStatus === StatusPedido.CANCELADO) &&
      !([Role.ATENDENTE, Role.GERENTE, Role.ADMIN] as Role[]).includes(input.roleRequisitante)
    ) {
      throw new PermissaoNegadaError(`transitar pedido para ${input.novoStatus}`);
    }

    // Dispara a máquina de estados — lança TransicaoStatusInvalidaError se inválida
    pedido.transitarStatus(input.novoStatus);

    await this.pedidoRepository.atualizarStatus(
      input.pedidoId,
      input.novoStatus,
      input.motivo,
    );

    // RF-04.11 — cancelamento estorna estoque
    if (input.novoStatus === StatusPedido.CANCELADO) {
      for (const item of pedido.itens) {
        const estoque = await this.estoqueRepository.buscarPorUnidadeEProduto(
          pedido.unidadeId,
          item.produtoId,
        );
        if (estoque) {
          await this.estoqueRepository.atualizar(
            estoque.id,
            estoque.quantidade + item.quantidade,
          );
          await this.estoqueRepository.registrarMovimentacao({
            id: uuidv4(),
            estoqueId: estoque.id,
            usuarioId: input.usuarioId,
            tipo: TipoMovimentacaoEstoque.ENTRADA,
            quantidade: item.quantidade,
            motivo: `Cancelamento do pedido #${pedido.numeroPedido}: ${input.motivo ?? ''}`,
          });
        }
      }

      this.logger.auditoria('PEDIDO_CANCELADO', {
        usuarioId: input.usuarioId,
        entidade: 'Pedido',
        entidadeId: input.pedidoId,
        ip: input.ip,
        extras: { motivo: input.motivo },
      });
    }

    this.logger.info('PEDIDO_STATUS_ATUALIZADO', {
      pedidoId: input.pedidoId,
      novoStatus: input.novoStatus,
      usuarioId: input.usuarioId,
    });
  }
}
