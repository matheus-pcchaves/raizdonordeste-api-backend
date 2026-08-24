import { IGatewayPagamento, SolicitarPagamentoInput, RespostaPagamento } from '../../../application/ports/IGatewayPagamento';
import { StatusPagamento } from '../../../domain/enums/StatusPagamento';

/**
 * Mock de gateway de pagamento para desenvolvimento e testes.
 * Simula APROVADO, NEGADO e PENDENTE (timeout) de forma determinística
 * baseado no valor do pedido para facilitar testes:
 * - Valor < 0.01 → NEGADO
 * - Valor com centavos .99 → simula timeout (PagamentoPendente)
 * - Demais → APROVADO
 */
export class MockGatewayPagamento implements IGatewayPagamento {
  private readonly timeoutMs: number;

  constructor() {
    this.timeoutMs = Number(process.env['PAYMENT_GATEWAY_TIMEOUT_MS'] ?? 5000);
  }

  async solicitarPagamento(input: SolicitarPagamentoInput): Promise<RespostaPagamento> {
    const centavos = Math.round((input.valor % 1) * 100);

    // Simula timeout
    if (centavos === 99) {
      await this.sleep(this.timeoutMs + 100);
      // Se chegou aqui, o timeout não foi capturado externamente — retorna ERRO
      return {
        status: StatusPagamento.ERRO,
        payload: {
          mensagem: 'Gateway indisponível (timeout simulado)',
          pedidoId: input.pedidoId,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Simula pagamento negado
    if (input.valor < 0.01) {
      return {
        status: StatusPagamento.NEGADO,
        payload: {
          transacaoId: `NEG-${Date.now()}`,
          pedidoId: input.pedidoId,
          motivo: 'Valor inválido',
          timestamp: new Date().toISOString(),
        },
        transacaoId: `NEG-${Date.now()}`,
      };
    }

    // Simula aprovação
    await this.sleep(50); // latência artificial mínima
    return {
      status: StatusPagamento.APROVADO,
      payload: {
        transacaoId: `APR-${Date.now()}`,
        pedidoId: input.pedidoId,
        valor: input.valor,
        metodoPagamento: input.metodoPagamento,
        timestamp: new Date().toISOString(),
        autorizacao: Math.random().toString(36).substring(2, 10).toUpperCase(),
      },
      transacaoId: `APR-${Date.now()}`,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
