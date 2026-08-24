import { StatusPagamento } from '../enums/StatusPagamento';

export interface PagamentoProps {
  id: string;
  pedidoId: string;
  metodoPagamento: string;
  status: StatusPagamento;
  payloadResposta: Record<string, unknown> | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export class Pagamento {
  readonly id: string;
  readonly pedidoId: string;
  readonly metodoPagamento: string;
  private _status: StatusPagamento;
  private _payloadResposta: Record<string, unknown> | null;
  readonly criadoEm: Date;
  private _atualizadoEm: Date;

  constructor(props: PagamentoProps) {
    this.id = props.id;
    this.pedidoId = props.pedidoId;
    this.metodoPagamento = props.metodoPagamento;
    this._status = props.status;
    this._payloadResposta = props.payloadResposta;
    this.criadoEm = props.criadoEm;
    this._atualizadoEm = props.atualizadoEm;
  }

  get status(): StatusPagamento {
    return this._status;
  }

  get payloadResposta(): Record<string, unknown> | null {
    return this._payloadResposta;
  }

  get atualizadoEm(): Date {
    return this._atualizadoEm;
  }

  registrarAprovacao(payload: Record<string, unknown>): void {
    this._status = StatusPagamento.APROVADO;
    this._payloadResposta = payload;
    this._atualizadoEm = new Date();
  }

  registrarNegativa(payload: Record<string, unknown>): void {
    this._status = StatusPagamento.NEGADO;
    this._payloadResposta = payload;
    this._atualizadoEm = new Date();
  }

  registrarErro(erro: string): void {
    this._status = StatusPagamento.ERRO;
    this._payloadResposta = { erro, timestamp: new Date().toISOString() };
    this._atualizadoEm = new Date();
  }

  isAprovado(): boolean {
    return this._status === StatusPagamento.APROVADO;
  }
}
