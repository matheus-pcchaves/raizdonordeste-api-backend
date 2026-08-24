import { StatusPagamento } from '../../domain/enums/StatusPagamento';

export interface SolicitarPagamentoInput {
  pedidoId: string;
  valor: number;
  metodoPagamento: string;
}

export interface RespostaPagamento {
  status: StatusPagamento;
  payload: Record<string, unknown>;
  transacaoId?: string;
}

/** Port: serviço externo de gateway de pagamento */
export interface IGatewayPagamento {
  solicitarPagamento(input: SolicitarPagamentoInput): Promise<RespostaPagamento>;
}
