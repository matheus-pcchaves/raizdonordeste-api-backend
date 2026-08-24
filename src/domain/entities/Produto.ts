import { StatusProduto } from '../enums/StatusProduto';

export interface ProdutoProps {
  id: string;
  nome: string;
  descricao: string | null;
  precoBase: number;
  imagemUrl: string | null;
  status: StatusProduto;
  categoriaId: string;
  criadoEm: Date;
}

export class Produto {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string | null;
  readonly precoBase: number;
  readonly imagemUrl: string | null;
  private _status: StatusProduto;
  readonly categoriaId: string;
  readonly criadoEm: Date;

  constructor(props: ProdutoProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.descricao = props.descricao;
    this.precoBase = props.precoBase;
    this.imagemUrl = props.imagemUrl;
    this._status = props.status;
    this.categoriaId = props.categoriaId;
    this.criadoEm = props.criadoEm;
  }

  get status(): StatusProduto {
    return this._status;
  }

  marcarIndisponivel(): void {
    this._status = StatusProduto.INDISPONIVEL;
  }

  marcarDisponivel(): void {
    this._status = StatusProduto.DISPONIVEL;
  }

  isDisponivel(): boolean {
    return this._status === StatusProduto.DISPONIVEL;
  }
}
