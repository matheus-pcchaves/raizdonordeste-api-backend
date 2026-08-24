import { CriarPedidoUseCase } from '../../../application/use-cases/pedidos/CriarPedidoUseCase';
import { InMemoryPedidoRepository } from '../../../infrastructure/database/repositories/InMemoryPedidoRepository';
import { InMemoryEstoqueRepository } from '../../../infrastructure/database/repositories/InMemoryEstoqueRepository';
import { InMemoryPagamentoRepository } from '../../../infrastructure/database/repositories/InMemoryPagamentoRepository';
import { InMemoryUnidadeRepository } from '../../../infrastructure/database/repositories/InMemoryUnidadeRepository';
import { InMemoryCampanhaRepository } from '../../../infrastructure/database/repositories/InMemoryCampanhaRepository';
import { InMemoryFidelidadeRepository } from '../../../infrastructure/database/repositories/InMemoryFidelidadeRepository';
import { PromocaoService } from '../../../application/services/PromocaoService';
import { FidelidadeService } from '../../../application/services/FidelidadeService';
import { IGatewayPagamento, SolicitarPagamentoInput, RespostaPagamento } from '../../../application/ports/IGatewayPagamento';
import { ILogger } from '../../../application/ports/ILogger';
import { StatusPagamento } from '../../../domain/enums/StatusPagamento';
import { StatusPedido } from '../../../domain/enums/StatusPedido';
import { CanalPedido } from '../../../domain/enums/CanalPedido';
import { StatusUnidade } from '../../../domain/enums/StatusUnidade';
import { Unidade } from '../../../domain/entities/Unidade';
import { EstoqueInsuficienteError } from '../../../domain/errors/DomainErrors';

// ─── Fakes ────────────────────────────────────────────────────────────────────

class FakeLogger implements ILogger {
  info(_msg: string, _ctx?: Record<string, unknown>): void {}
  warn(_msg: string, _ctx?: Record<string, unknown>): void {}
  error(_msg: string, _ctx?: Record<string, unknown>): void {}
  debug(_msg: string, _ctx?: Record<string, unknown>): void {}
  auditoria(_acao: string, _ctx: Record<string, unknown>): void {}
}

class GatewayAprovado implements IGatewayPagamento {
  async solicitarPagamento(_input: SolicitarPagamentoInput): Promise<RespostaPagamento> {
    return {
      status: StatusPagamento.APROVADO,
      payload: { transacaoId: 'APR-001', timestamp: new Date().toISOString() },
      transacaoId: 'APR-001',
    };
  }
}

class GatewayNegado implements IGatewayPagamento {
  async solicitarPagamento(_input: SolicitarPagamentoInput): Promise<RespostaPagamento> {
    return {
      status: StatusPagamento.NEGADO,
      payload: { motivo: 'Saldo insuficiente', timestamp: new Date().toISOString() },
    };
  }
}

class GatewayTimeout implements IGatewayPagamento {
  async solicitarPagamento(_input: SolicitarPagamentoInput): Promise<RespostaPagamento> {
    throw new Error('ECONNRESET: connection timed out');
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const UNIDADE_ID = 'unidade-1';
const PRODUTO_ID = 'produto-1';

function criarDependencias(gateway: IGatewayPagamento) {
  const pedidoRepository = new InMemoryPedidoRepository();
  const estoqueRepository = new InMemoryEstoqueRepository();
  const pagamentoRepository = new InMemoryPagamentoRepository();
  const unidadeRepository = new InMemoryUnidadeRepository();
  const campanhaRepository = new InMemoryCampanhaRepository();
  const fidelidadeRepository = new InMemoryFidelidadeRepository();
  const logger = new FakeLogger();

  const promocaoService = new PromocaoService(campanhaRepository);
  const fidelidadeService = new FidelidadeService(fidelidadeRepository, logger);

  const useCase = new CriarPedidoUseCase(
    pedidoRepository,
    estoqueRepository,
    pagamentoRepository,
    unidadeRepository,
    gateway,
    promocaoService,
    fidelidadeService,
    logger,
  );

  return { useCase, unidadeRepository, estoqueRepository, pagamentoRepository, pedidoRepository };
}

async function prepararUnidadeComEstoque(
  unidadeRepository: InMemoryUnidadeRepository,
  estoqueRepository: InMemoryEstoqueRepository,
  quantidade = 10,
) {
  await unidadeRepository.criar({
    id: UNIDADE_ID,
    nome: 'Unidade Centro',
    endereco: 'Rua das Tapiocas, 1',
    cnpj: '12345678000195',
    telefone: '8511112222',
    status: StatusUnidade.ATIVA,
  });

  const estoque = await estoqueRepository.criarSeNaoExistir(UNIDADE_ID, PRODUTO_ID, 'UN', 2);
  await estoqueRepository.atualizar(estoque.id, quantidade);
}

const INPUT_BASE = {
  clienteId: 'cliente-1',
  unidadeId: UNIDADE_ID,
  canalPedido: CanalPedido.APP,
  itens: [{ produtoId: PRODUTO_ID, quantidade: 2 }],
  formaPagamento: 'MOCK',
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('CriarPedidoUseCase — caminho feliz (pagamento aprovado)', () => {
  test('retorna pedido com status EM_PREPARO e pagamento APROVADO', async () => {
    const { useCase, unidadeRepository, estoqueRepository } = criarDependencias(new GatewayAprovado());
    await prepararUnidadeComEstoque(unidadeRepository, estoqueRepository);

    const resultado = await useCase.execute(INPUT_BASE);

    expect(resultado.pedido.status).toBe(StatusPedido.EM_PREPARO);
    expect(resultado.pedido.canalPedido).toBe(CanalPedido.APP);
    expect(resultado.pedido.numeroPedido).toBe('#0001');
    expect(resultado.pagamento.status).toBe(StatusPagamento.APROVADO);
  });

  test('gera número sequencial de pedido por unidade', async () => {
    const { useCase, unidadeRepository, estoqueRepository } = criarDependencias(new GatewayAprovado());
    await prepararUnidadeComEstoque(unidadeRepository, estoqueRepository, 100);

    const r1 = await useCase.execute(INPUT_BASE);
    const r2 = await useCase.execute(INPUT_BASE);

    expect(r1.pedido.numeroPedido).toBe('#0001');
    expect(r2.pedido.numeroPedido).toBe('#0002');
  });
});

describe('CriarPedidoUseCase — estoque insuficiente', () => {
  test('lança EstoqueInsuficienteError quando estoque é menor que o solicitado', async () => {
    const { useCase, unidadeRepository, estoqueRepository } = criarDependencias(new GatewayAprovado());
    await prepararUnidadeComEstoque(unidadeRepository, estoqueRepository, 1); // só 1 disponível

    await expect(
      useCase.execute({
        ...INPUT_BASE,
        itens: [{ produtoId: PRODUTO_ID, quantidade: 5 }], // pede 5
      }),
    ).rejects.toThrow(EstoqueInsuficienteError);
  });

  test('não cria pedido quando estoque é insuficiente', async () => {
    const { useCase, unidadeRepository, estoqueRepository, pedidoRepository } = criarDependencias(new GatewayAprovado());
    await prepararUnidadeComEstoque(unidadeRepository, estoqueRepository, 0);

    await expect(useCase.execute(INPUT_BASE)).rejects.toThrow(EstoqueInsuficienteError);
    const result = await pedidoRepository.listar({ page: 1, limit: 10 });
    expect(result.total).toBe(0);
  });
});

describe('CriarPedidoUseCase — pagamento negado', () => {
  test('lança PagamentoNegadoError e estorna estoque quando pagamento é negado', async () => {
    const { useCase, unidadeRepository, estoqueRepository } = criarDependencias(new GatewayNegado());
    await prepararUnidadeComEstoque(unidadeRepository, estoqueRepository, 10);

    await expect(useCase.execute(INPUT_BASE)).rejects.toMatchObject({ code: 'PAGAMENTO_NEGADO' });

    // Verifica que o estoque foi estornado
    const estoque = await estoqueRepository.buscarPorUnidadeEProduto(UNIDADE_ID, PRODUTO_ID);
    expect(estoque!.quantidade).toBe(10); // volta ao estado inicial
  });
});

describe('CriarPedidoUseCase — timeout do gateway', () => {
  test('lança PagamentoPendenteError quando o gateway falha com timeout', async () => {
    const { useCase, unidadeRepository, estoqueRepository } = criarDependencias(new GatewayTimeout());
    await prepararUnidadeComEstoque(unidadeRepository, estoqueRepository, 10);

    await expect(useCase.execute(INPUT_BASE)).rejects.toMatchObject({ code: 'PAGAMENTO_PENDENTE' });
  });
});

describe('CriarPedidoUseCase — unidade inativa', () => {
  test('lança UnidadeInativaError para unidade com status INATIVA', async () => {
    const { useCase, unidadeRepository } = criarDependencias(new GatewayAprovado());
    await unidadeRepository.criar({
      id: UNIDADE_ID,
      nome: 'Unidade Fechada',
      endereco: 'Rua A, 1',
      cnpj: '98765432000100',
      telefone: '8500001111',
      status: StatusUnidade.INATIVA,
    });

    await expect(useCase.execute(INPUT_BASE)).rejects.toMatchObject({ code: 'UNIDADE_INATIVA' });
  });
});
