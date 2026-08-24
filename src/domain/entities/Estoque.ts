import { TipoMovimentacaoEstoque } from '../enums/TipoMovimentacaoEstoque';
import { EstoqueInsuficienteError } from '../errors/DomainErrors';

export interface MovimentacaoEstoqueProps {
  id: string;
  estoqueId: string;
  usuarioId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  motivo: string;
  criadoEm: Date;
}

export class MovimentacaoEstoque {
  readonly id: string;
  readonly estoqueId: string;
  readonly usuarioId: string;
  readonly tipo: TipoMovimentacaoEstoque;
  readonly quantidade: number;
  readonly motivo: string;
  readonly criadoEm: Date;

  constructor(props: MovimentacaoEstoqueProps) {
    this.id = props.id;
    this.estoqueId = props.estoqueId;
    this.usuarioId = props.usuarioId;
    this.tipo = props.tipo;
    this.quantidade = props.quantidade;
    this.motivo = props.motivo;
    this.criadoEm = props.criadoEm;
  }
}

export interface EstoqueProps {
  id: string;
  unidadeId: string;
  produtoId: string;
  quantidade: number;
  unidadeMedida: string;
  quantidadeMinima: number;
  atualizadoEm: Date;
}

export class Estoque {
  readonly id: string;
  readonly unidadeId: string;
  readonly produtoId: string;
  private _quantidade: number;
  readonly unidadeMedida: string;
  readonly quantidadeMinima: number;
  private _atualizadoEm: Date;

  constructor(props: EstoqueProps) {
    this.id = props.id;
    this.unidadeId = props.unidadeId;
    this.produtoId = props.produtoId;
    this._quantidade = props.quantidade;
    this.unidadeMedida = props.unidadeMedida;
    this.quantidadeMinima = props.quantidadeMinima;
    this._atualizadoEm = props.atualizadoEm;
  }

  get quantidade(): number {
    return this._quantidade;
  }

  get atualizadoEm(): Date {
    return this._atualizadoEm;
  }

  verificarDisponibilidade(qtd: number): boolean {
    return this._quantidade >= qtd;
  }

  atingiuMinimo(): boolean {
    return this._quantidade <= this.quantidadeMinima;
  }

  reservar(qtd: number, nomeProduto: string): void {
    if (!this.verificarDisponibilidade(qtd)) {
      throw new EstoqueInsuficienteError(nomeProduto, this._quantidade, qtd);
    }
    this._quantidade -= qtd;
    this._atualizadoEm = new Date();
  }

  estornar(qtd: number): void {
    this._quantidade += qtd;
    this._atualizadoEm = new Date();
  }

  entrada(qtd: number): void {
    if (qtd <= 0) throw new Error('Quantidade de entrada deve ser positiva.');
    this._quantidade += qtd;
    this._atualizadoEm = new Date();
  }

  ajustar(novaQuantidade: number): void {
    if (novaQuantidade < 0) throw new Error('Quantidade não pode ser negativa.');
    this._quantidade = novaQuantidade;
    this._atualizadoEm = new Date();
  }
}
