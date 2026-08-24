import { TipoExtrato } from '../enums/TipoExtrato';
import { SaldoPontosInsuficienteError } from '../errors/DomainErrors';

export interface ExtratoFidelidadeProps {
  id: string;
  fidelidadeId: string;
  pedidoId: string | null;
  tipo: TipoExtrato;
  pontos: number;
  descricao: string;
  criadoEm: Date;
}

export class ExtratoFidelidade {
  readonly id: string;
  readonly fidelidadeId: string;
  readonly pedidoId: string | null;
  readonly tipo: TipoExtrato;
  readonly pontos: number;
  readonly descricao: string;
  readonly criadoEm: Date;

  constructor(props: ExtratoFidelidadeProps) {
    this.id = props.id;
    this.fidelidadeId = props.fidelidadeId;
    this.pedidoId = props.pedidoId;
    this.tipo = props.tipo;
    this.pontos = props.pontos;
    this.descricao = props.descricao;
    this.criadoEm = props.criadoEm;
  }
}

export interface FidelidadeProps {
  id: string;
  clienteId: string;
  pontosSaldo: number;
  atualizadoEm: Date;
}

export class Fidelidade {
  readonly id: string;
  readonly clienteId: string;
  private _pontosSaldo: number;
  private _atualizadoEm: Date;

  constructor(props: FidelidadeProps) {
    this.id = props.id;
    this.clienteId = props.clienteId;
    this._pontosSaldo = props.pontosSaldo;
    this._atualizadoEm = props.atualizadoEm;
  }

  get pontosSaldo(): number {
    return this._pontosSaldo;
  }

  get atualizadoEm(): Date {
    return this._atualizadoEm;
  }

  verificarSaldo(pontos: number): boolean {
    return this._pontosSaldo >= pontos;
  }

  /**
   * Calcula pontos a ganhar com base no valor do pedido.
   * Regra padrão: R$ 1,00 = 1 ponto (ratio configurável via env)
   */
  calcularPontosGanhos(valorPedido: number, ratio = 1): number {
    return Math.floor(valorPedido * ratio);
  }

  acumular(pontos: number): void {
    if (pontos <= 0) throw new Error('Pontos a acumular devem ser positivos.');
    this._pontosSaldo += pontos;
    this._atualizadoEm = new Date();
  }

  resgatar(pontos: number): void {
    if (!this.verificarSaldo(pontos)) {
      throw new SaldoPontosInsuficienteError(this._pontosSaldo, pontos);
    }
    this._pontosSaldo -= pontos;
    this._atualizadoEm = new Date();
  }
}
