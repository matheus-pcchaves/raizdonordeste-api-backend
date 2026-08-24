import { Pedido, ItemPedido } from '../entities/Pedido';
import { CanalPedido } from '../enums/CanalPedido';
import { StatusPedido } from '../enums/StatusPedido';

export interface CriarItemPedidoData {
  id: string;
  pedidoId: string;
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  descontoAplicado: number;
  origemDesconto: string | null;
}

export interface CriarPedidoData {
  id: string;
  numeroPedido: string;
  clienteId: string | null;
  unidadeId: string;
  canalPedido: CanalPedido;
  status: StatusPedido;
  valorTotal: number;
  descontoTotal: number;
  itens: CriarItemPedidoData[];
}

export interface FiltrosPedido {
  unidadeId?: string;
  clienteId?: string;
  status?: StatusPedido;
  canalPedido?: CanalPedido;
  page: number;
  limit: number;
}

export interface IPedidoRepository {
  criar(data: CriarPedidoData): Promise<Pedido>;
  buscarPorId(id: string): Promise<Pedido | null>;
  buscarPorIdComItens(id: string): Promise<Pedido | null>;
  listar(filtros: FiltrosPedido): Promise<{ pedidos: Pedido[]; total: number }>;
  atualizarStatus(id: string, status: StatusPedido, motivoCancelamento?: string): Promise<void>;
  proximoNumeroPedido(unidadeId: string): Promise<string>;
}
