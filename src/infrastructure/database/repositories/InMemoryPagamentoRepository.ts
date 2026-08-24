import { IPagamentoRepository, CriarPagamentoData } from '../../../domain/repositories/IPagamentoRepository';
import { Pagamento } from '../../../domain/entities/Pagamento';
import { StatusPagamento } from '../../../domain/enums/StatusPagamento';

export class InMemoryPagamentoRepository implements IPagamentoRepository {
  private pagamentos: Map<string, Pagamento> = new Map();

  async criar(data: CriarPagamentoData): Promise<Pagamento> {
    const pagamento = new Pagamento({
      id: data.id,
      pedidoId: data.pedidoId,
      metodoPagamento: data.metodoPagamento,
      status: data.status,
      payloadResposta: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });
    this.pagamentos.set(data.id, pagamento);
    return pagamento;
  }

  async buscarPorPedidoId(pedidoId: string): Promise<Pagamento | null> {
    for (const p of this.pagamentos.values()) {
      if (p.pedidoId === pedidoId) return p;
    }
    return null;
  }

  async atualizar(
    id: string,
    data: { status: StatusPagamento; payloadResposta: Record<string, unknown> },
  ): Promise<Pagamento> {
    const p = this.pagamentos.get(id);
    if (!p) throw new Error(`Pagamento ${id} não encontrado`);
    const atualizado = new Pagamento({
      ...p,
      status: data.status,
      payloadResposta: data.payloadResposta,
      atualizadoEm: new Date(),
    });
    this.pagamentos.set(id, atualizado);
    return atualizado;
  }
}
