import { IPedidoRepository, CriarPedidoData, FiltrosPedido } from '../../../domain/repositories/IPedidoRepository';
import { Pedido, ItemPedido } from '../../../domain/entities/Pedido';
import { StatusPedido } from '../../../domain/enums/StatusPedido';

export class InMemoryPedidoRepository implements IPedidoRepository {
  private pedidos: Map<string, Pedido> = new Map();
  private contadores: Map<string, number> = new Map();

  async criar(data: CriarPedidoData): Promise<Pedido> {
    const itens = data.itens.map((i) => new ItemPedido(i));
    const pedido = new Pedido({
      id: data.id,
      numeroPedido: data.numeroPedido,
      clienteId: data.clienteId,
      unidadeId: data.unidadeId,
      canalPedido: data.canalPedido,
      status: data.status,
      valorTotal: data.valorTotal,
      descontoTotal: data.descontoTotal,
      motivoCancelamento: null,
      itens,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });
    this.pedidos.set(data.id, pedido);
    return pedido;
  }

  async buscarPorId(id: string): Promise<Pedido | null> {
    return this.pedidos.get(id) ?? null;
  }

  async buscarPorIdComItens(id: string): Promise<Pedido | null> {
    return this.pedidos.get(id) ?? null;
  }

  async listar(filtros: FiltrosPedido): Promise<{ pedidos: Pedido[]; total: number }> {
    let todos = [...this.pedidos.values()];
    if (filtros.unidadeId) todos = todos.filter((p) => p.unidadeId === filtros.unidadeId);
    if (filtros.clienteId) todos = todos.filter((p) => p.clienteId === filtros.clienteId);
    if (filtros.status) todos = todos.filter((p) => p.status === filtros.status);
    if (filtros.canalPedido) todos = todos.filter((p) => p.canalPedido === filtros.canalPedido);
    const total = todos.length;
    return { pedidos: todos.slice((filtros.page - 1) * filtros.limit, filtros.page * filtros.limit), total };
  }

  async atualizarStatus(id: string, status: StatusPedido, motivoCancelamento?: string): Promise<void> {
    const p = this.pedidos.get(id);
    if (p) {
      const atualizado = new Pedido({
        id: p.id,
        numeroPedido: p.numeroPedido,
        clienteId: p.clienteId,
        unidadeId: p.unidadeId,
        canalPedido: p.canalPedido,
        status,
        valorTotal: p.valorTotal,
        descontoTotal: p.descontoTotal,
        motivoCancelamento: motivoCancelamento ?? p.motivoCancelamento,
        itens: [...p.itens],
        criadoEm: p.criadoEm,
        atualizadoEm: new Date(),
      });
      this.pedidos.set(id, atualizado);
    }
  }

  async proximoNumeroPedido(unidadeId: string): Promise<string> {
    const atual = this.contadores.get(unidadeId) ?? 0;
    const proximo = atual + 1;
    this.contadores.set(unidadeId, proximo);
    return `#${String(proximo).padStart(4, '0')}`;
  }
}
