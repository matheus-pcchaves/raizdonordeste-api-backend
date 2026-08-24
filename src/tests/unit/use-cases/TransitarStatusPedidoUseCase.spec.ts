import { TransitarStatusPedidoUseCase } from '../../../application/use-cases/pedidos/TransitarStatusPedidoUseCase';
import { InMemoryPedidoRepository } from '../../../infrastructure/database/repositories/InMemoryPedidoRepository';
import { InMemoryEstoqueRepository } from '../../../infrastructure/database/repositories/InMemoryEstoqueRepository';
import { ILogger } from '../../../application/ports/ILogger';
import { Role } from '../../../domain/enums/Role';
import { StatusPedido } from '../../../domain/enums/StatusPedido';
import { CanalPedido } from '../../../domain/enums/CanalPedido';
import {
  PermissaoNegadaError,
  RecursoNaoEncontradoError,
  TransicaoStatusInvalidaError,
} from '../../../domain/errors/DomainErrors';
import { ItemPedido, Pedido } from '../../../domain/entities/Pedido';

class FakeLogger implements ILogger {
  info(_msg: string, _ctx?: Record<string, unknown>): void {}
  warn(_msg: string, _ctx?: Record<string, unknown>): void {}
  error(_msg: string, _ctx?: Record<string, unknown>): void {}
  debug(_msg: string, _ctx?: Record<string, unknown>): void {}
  auditoria(_acao: string, _ctx: Record<string, unknown>): void {}
}

const PRODUTO_ID = 'produto-1';
const UNIDADE_ID = 'unidade-1';

function criarPedidoNaMemoria(
  repo: InMemoryPedidoRepository,
  status: StatusPedido,
  id = 'pedido-1',
): void {
  const item = new ItemPedido({
    id: 'item-1',
    pedidoId: id,
    produtoId: PRODUTO_ID,
    nomeProduto: 'Tapioca de Frango',
    quantidade: 2,
    precoUnitario: 20,
    descontoAplicado: 0,
    origemDesconto: null,
  });
  const pedido = new Pedido({
    id,
    numeroPedido: '#0001',
    clienteId: 'cliente-1',
    unidadeId: UNIDADE_ID,
    canalPedido: CanalPedido.APP,
    status,
    valorTotal: 40,
    descontoTotal: 0,
    motivoCancelamento: null,
    itens: [item],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });
  // Inserir diretamente via método criar do repositório
  void repo.criar({
    id: pedido.id,
    numeroPedido: pedido.numeroPedido,
    clienteId: pedido.clienteId,
    unidadeId: pedido.unidadeId,
    canalPedido: pedido.canalPedido,
    status: pedido.status,
    valorTotal: pedido.valorTotal,
    descontoTotal: pedido.descontoTotal,
    itens: [item],
  });
}

function criarUseCase() {
  const pedidoRepository = new InMemoryPedidoRepository();
  const estoqueRepository = new InMemoryEstoqueRepository();
  const logger = new FakeLogger();
  const useCase = new TransitarStatusPedidoUseCase(pedidoRepository, estoqueRepository, logger);
  return { useCase, pedidoRepository, estoqueRepository };
}

describe('TransitarStatusPedidoUseCase — transições válidas', () => {
  test('COZINHA pode mover pedido de EM_PREPARO para PRONTO', async () => {
    const { useCase, pedidoRepository } = criarUseCase();
    await pedidoRepository.criar({
      id: 'pedido-1',
      numeroPedido: '#0001',
      clienteId: null,
      unidadeId: UNIDADE_ID,
      canalPedido: CanalPedido.TOTEM,
      status: StatusPedido.EM_PREPARO,
      valorTotal: 40,
      descontoTotal: 0,
      itens: [],
    });

    await expect(
      useCase.execute({
        pedidoId: 'pedido-1',
        novoStatus: StatusPedido.PRONTO,
        roleRequisitante: Role.COZINHA,
        usuarioId: 'cozinheiro-1',
      }),
    ).resolves.toBeUndefined();
  });

  test('ATENDENTE pode marcar pedido como ENTREGUE', async () => {
    const { useCase, pedidoRepository } = criarUseCase();
    await pedidoRepository.criar({
      id: 'pedido-2',
      numeroPedido: '#0002',
      clienteId: null,
      unidadeId: UNIDADE_ID,
      canalPedido: CanalPedido.BALCAO,
      status: StatusPedido.PRONTO,
      valorTotal: 30,
      descontoTotal: 0,
      itens: [],
    });

    await expect(
      useCase.execute({
        pedidoId: 'pedido-2',
        novoStatus: StatusPedido.ENTREGUE,
        roleRequisitante: Role.ATENDENTE,
        usuarioId: 'atendente-1',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('TransitarStatusPedidoUseCase — permissões RBAC', () => {
  test('CLIENTE não pode transitar status para PRONTO', async () => {
    const { useCase, pedidoRepository } = criarUseCase();
    await pedidoRepository.criar({
      id: 'pedido-3',
      numeroPedido: '#0003',
      clienteId: 'cliente-1',
      unidadeId: UNIDADE_ID,
      canalPedido: CanalPedido.APP,
      status: StatusPedido.EM_PREPARO,
      valorTotal: 25,
      descontoTotal: 0,
      itens: [],
    });

    await expect(
      useCase.execute({
        pedidoId: 'pedido-3',
        novoStatus: StatusPedido.PRONTO,
        roleRequisitante: Role.CLIENTE,
        usuarioId: 'cliente-1',
      }),
    ).rejects.toThrow(PermissaoNegadaError);
  });

  test('COZINHA não pode marcar pedido como ENTREGUE', async () => {
    const { useCase, pedidoRepository } = criarUseCase();
    await pedidoRepository.criar({
      id: 'pedido-4',
      numeroPedido: '#0004',
      clienteId: null,
      unidadeId: UNIDADE_ID,
      canalPedido: CanalPedido.TOTEM,
      status: StatusPedido.PRONTO,
      valorTotal: 50,
      descontoTotal: 0,
      itens: [],
    });

    await expect(
      useCase.execute({
        pedidoId: 'pedido-4',
        novoStatus: StatusPedido.ENTREGUE,
        roleRequisitante: Role.COZINHA,
        usuarioId: 'cozinheiro-1',
      }),
    ).rejects.toThrow(PermissaoNegadaError);
  });
});

describe('TransitarStatusPedidoUseCase — máquina de estados', () => {
  test('transição inválida lança TransicaoStatusInvalidaError', async () => {
    const { useCase, pedidoRepository } = criarUseCase();
    await pedidoRepository.criar({
      id: 'pedido-5',
      numeroPedido: '#0005',
      clienteId: null,
      unidadeId: UNIDADE_ID,
      canalPedido: CanalPedido.WEB,
      status: StatusPedido.PENDENTE, // não pode ir de PENDENTE direto para ENTREGUE
      valorTotal: 60,
      descontoTotal: 0,
      itens: [],
    });

    await expect(
      useCase.execute({
        pedidoId: 'pedido-5',
        novoStatus: StatusPedido.ENTREGUE,
        roleRequisitante: Role.GERENTE,
        usuarioId: 'gerente-1',
      }),
    ).rejects.toThrow(TransicaoStatusInvalidaError);
  });
});

describe('TransitarStatusPedidoUseCase — pedido não encontrado', () => {
  test('lança RecursoNaoEncontradoError para pedido inexistente', async () => {
    const { useCase } = criarUseCase();

    await expect(
      useCase.execute({
        pedidoId: 'pedido-inexistente',
        novoStatus: StatusPedido.PRONTO,
        roleRequisitante: Role.COZINHA,
        usuarioId: 'cozinheiro-1',
      }),
    ).rejects.toThrow(RecursoNaoEncontradoError);
  });
});

describe('TransitarStatusPedidoUseCase — cancelamento estorna estoque', () => {
  test('estorno de estoque ao cancelar pedido com itens', async () => {
    const { useCase, pedidoRepository, estoqueRepository } = criarUseCase();

    // Criar estoque com 10 unidades
    const estoque = await estoqueRepository.criarSeNaoExistir(UNIDADE_ID, PRODUTO_ID, 'UN', 0);
    await estoqueRepository.atualizar(estoque.id, 10);

    // Criar pedido em CONFIRMADO (permite cancelamento)
    await pedidoRepository.criar({
      id: 'pedido-6',
      numeroPedido: '#0006',
      clienteId: 'cliente-1',
      unidadeId: UNIDADE_ID,
      canalPedido: CanalPedido.APP,
      status: StatusPedido.CONFIRMADO,
      valorTotal: 80,
      descontoTotal: 0,
      itens: [
        {
          id: 'item-1',
          pedidoId: 'pedido-6',
          produtoId: PRODUTO_ID,
          nomeProduto: 'Tapioca',
          quantidade: 3,
          precoUnitario: 20,
          descontoAplicado: 0,
          origemDesconto: null,
        },
      ],
    });

    await useCase.execute({
      pedidoId: 'pedido-6',
      novoStatus: StatusPedido.CANCELADO,
      roleRequisitante: Role.ATENDENTE,
      usuarioId: 'atendente-1',
      motivo: 'Teste de cancelamento',
    });

    // Verifica que o estoque foi estornado (10 + 3 = 13)
    const estoqueAtualizado = await estoqueRepository.buscarPorUnidadeEProduto(UNIDADE_ID, PRODUTO_ID);
    expect(estoqueAtualizado!.quantidade).toBe(13);
  });
});
