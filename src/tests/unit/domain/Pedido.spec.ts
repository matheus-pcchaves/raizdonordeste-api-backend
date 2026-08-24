import { Pedido, ItemPedido } from '../../../domain/entities/Pedido';
import { CanalPedido } from '../../../domain/enums/CanalPedido';
import { StatusPedido } from '../../../domain/enums/StatusPedido';
import { TransicaoStatusInvalidaError } from '../../../domain/errors/DomainErrors';

const criarItemPedido = (overrides = {}): ItemPedido =>
  new ItemPedido({
    id: 'item-1',
    pedidoId: 'pedido-1',
    produtoId: 'prod-1',
    nomeProduto: 'Tapioca de Frango',
    quantidade: 2,
    precoUnitario: 25.00,
    descontoAplicado: 5.00,
    origemDesconto: 'CAMPANHA:camp-1:Promo Verão',
    ...overrides,
  });

const criarPedido = (status = StatusPedido.PENDENTE): Pedido =>
  new Pedido({
    id: 'pedido-1',
    numeroPedido: '#0001',
    clienteId: 'cliente-1',
    unidadeId: 'unidade-1',
    canalPedido: CanalPedido.APP,
    status,
    valorTotal: 40.00,
    descontoTotal: 10.00,
    motivoCancelamento: null,
    itens: [criarItemPedido()],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });

describe('Pedido — máquina de estados', () => {
  test('transição válida PENDENTE → AGUARDANDO_PAGAMENTO é permitida', () => {
    const pedido = criarPedido(StatusPedido.PENDENTE);
    pedido.transitarStatus(StatusPedido.AGUARDANDO_PAGAMENTO);
    expect(pedido.status).toBe(StatusPedido.AGUARDANDO_PAGAMENTO);
  });

  test('transição inválida PENDENTE → ENTREGUE lança TransicaoStatusInvalidaError', () => {
    const pedido = criarPedido(StatusPedido.PENDENTE);
    expect(() => pedido.transitarStatus(StatusPedido.ENTREGUE)).toThrow(TransicaoStatusInvalidaError);
  });

  test('transição inválida de ENTREGUE para qualquer status lança erro', () => {
    const pedido = criarPedido(StatusPedido.ENTREGUE);
    expect(() => pedido.transitarStatus(StatusPedido.CANCELADO)).toThrow(TransicaoStatusInvalidaError);
  });

  test('cancelar define motivo de cancelamento', () => {
    const pedido = criarPedido(StatusPedido.PENDENTE);
    pedido.cancelar('Pedido duplicado');
    expect(pedido.status).toBe(StatusPedido.CANCELADO);
    expect(pedido.motivoCancelamento).toBe('Pedido duplicado');
  });

  test('podeCancelarComoCliente retorna true em PENDENTE', () => {
    const pedido = criarPedido(StatusPedido.PENDENTE);
    expect(pedido.podeCancelarComoCliente()).toBe(true);
  });

  test('podeCancelarComoCliente retorna true em AGUARDANDO_PAGAMENTO', () => {
    const pedido = criarPedido(StatusPedido.AGUARDANDO_PAGAMENTO);
    expect(pedido.podeCancelarComoCliente()).toBe(true);
  });

  test('podeCancelarComoCliente retorna false em EM_PREPARO', () => {
    const pedido = criarPedido(StatusPedido.EM_PREPARO);
    expect(pedido.podeCancelarComoCliente()).toBe(false);
  });
});

describe('ItemPedido — cálculo de subtotal', () => {
  test('calcularSubtotal aplica desconto corretamente', () => {
    const item = criarItemPedido({ precoUnitario: 25.00, descontoAplicado: 5.00, quantidade: 2 });
    expect(item.calcularSubtotal()).toBe(40.00);
  });

  test('calcularSubtotal sem desconto', () => {
    const item = criarItemPedido({ precoUnitario: 30.00, descontoAplicado: 0, quantidade: 3 });
    expect(item.calcularSubtotal()).toBe(90.00);
  });
});
