export enum StatusPedido {
  PENDENTE = 'PENDENTE',
  AGUARDANDO_PAGAMENTO = 'AGUARDANDO_PAGAMENTO',
  CONFIRMADO = 'CONFIRMADO',
  EM_PREPARO = 'EM_PREPARO',
  PRONTO = 'PRONTO',
  ENTREGUE = 'ENTREGUE',
  CANCELADO = 'CANCELADO',
}

/**
 * Mapa de transições válidas da máquina de estados do pedido.
 * Cada chave é o status atual e o valor é o conjunto de próximos status permitidos.
 */
export const TRANSICOES_VALIDAS: Record<StatusPedido, StatusPedido[]> = {
  [StatusPedido.PENDENTE]: [StatusPedido.AGUARDANDO_PAGAMENTO, StatusPedido.CANCELADO],
  [StatusPedido.AGUARDANDO_PAGAMENTO]: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO],
  [StatusPedido.CONFIRMADO]: [StatusPedido.EM_PREPARO, StatusPedido.CANCELADO],
  [StatusPedido.EM_PREPARO]: [StatusPedido.PRONTO],
  [StatusPedido.PRONTO]: [StatusPedido.ENTREGUE],
  [StatusPedido.ENTREGUE]: [],
  [StatusPedido.CANCELADO]: [],
};
