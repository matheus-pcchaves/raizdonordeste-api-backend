import { CanalPedido } from '../enums/CanalPedido';
import { StatusPedido, TRANSICOES_VALIDAS } from '../enums/StatusPedido';
import { TransicaoStatusInvalidaError } from '../errors/DomainErrors';

export interface ItemPedidoProps {
  id: string;
  pedidoId: string;
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  descontoAplicado: number;
  origemDesconto: string | null;
}

export class ItemPedido {
  readonly id: string;
  readonly pedidoId: string;
  readonly produtoId: string;
  readonly nomeProduto: string;
  readonly quantidade: number;
  readonly precoUnitario: number;
  readonly descontoAplicado: number;
  readonly origemDesconto: string | null;

  constructor(props: ItemPedidoProps) {
    this.id = props.id;
    this.pedidoId = props.pedidoId;
    this.produtoId = props.produtoId;
    this.nomeProduto = props.nomeProduto;
    this.quantidade = props.quantidade;
    this.precoUnitario = props.precoUnitario;
    this.descontoAplicado = props.descontoAplicado;
    this.origemDesconto = props.origemDesconto;
  }

  calcularSubtotal(): number {
    return (this.precoUnitario - this.descontoAplicado) * this.quantidade;
  }
}

export interface PedidoProps {
  id: string;
  numeroPedido: string;
  clienteId: string | null;
  unidadeId: string;
  canalPedido: CanalPedido;
  status: StatusPedido;
  valorTotal: number;
  descontoTotal: number;
  motivoCancelamento: string | null;
  itens: ItemPedido[];
  criadoEm: Date;
  atualizadoEm: Date;
}

export class Pedido {
  readonly id: string;
  readonly numeroPedido: string;
  readonly clienteId: string | null;
  readonly unidadeId: string;
  readonly canalPedido: CanalPedido;
  private _status: StatusPedido;
  readonly valorTotal: number;
  readonly descontoTotal: number;
  private _motivoCancelamento: string | null;
  readonly itens: ItemPedido[];
  readonly criadoEm: Date;
  private _atualizadoEm: Date;

  constructor(props: PedidoProps) {
    this.id = props.id;
    this.numeroPedido = props.numeroPedido;
    this.clienteId = props.clienteId;
    this.unidadeId = props.unidadeId;
    this.canalPedido = props.canalPedido;
    this._status = props.status;
    this.valorTotal = props.valorTotal;
    this.descontoTotal = props.descontoTotal;
    this._motivoCancelamento = props.motivoCancelamento;
    this.itens = props.itens;
    this.criadoEm = props.criadoEm;
    this._atualizadoEm = props.atualizadoEm;
  }

  get status(): StatusPedido {
    return this._status;
  }

  get motivoCancelamento(): string | null {
    return this._motivoCancelamento;
  }

  get atualizadoEm(): Date {
    return this._atualizadoEm;
  }

  /** Transita o status respeitando a máquina de estados */
  transitarStatus(novoStatus: StatusPedido): void {
    const transicoesPermitidas = TRANSICOES_VALIDAS[this._status] ?? [];
    if (!transicoesPermitidas.includes(novoStatus)) {
      throw new TransicaoStatusInvalidaError(this._status, novoStatus);
    }
    this._status = novoStatus;
    this._atualizadoEm = new Date();
  }

  cancelar(motivo: string): void {
    this.transitarStatus(StatusPedido.CANCELADO);
    this._motivoCancelamento = motivo;
  }

  podeCancelarComoCliente(): boolean {
    return (
      this._status === StatusPedido.PENDENTE ||
      this._status === StatusPedido.AGUARDANDO_PAGAMENTO
    );
  }

  calcularTotal(): number {
    return this.itens.reduce((acc, item) => acc + item.calcularSubtotal(), 0);
  }
}
