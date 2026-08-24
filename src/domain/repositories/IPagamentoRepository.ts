import { Pagamento } from '../entities/Pagamento';
import { StatusPagamento } from '../enums/StatusPagamento';

export interface CriarPagamentoData {
  id: string;
  pedidoId: string;
  metodoPagamento: string;
  status: StatusPagamento;
}

export interface IPagamentoRepository {
  criar(data: CriarPagamentoData): Promise<Pagamento>;
  buscarPorPedidoId(pedidoId: string): Promise<Pagamento | null>;
  atualizar(
    id: string,
    data: { status: StatusPagamento; payloadResposta: Record<string, unknown> },
  ): Promise<Pagamento>;
}
