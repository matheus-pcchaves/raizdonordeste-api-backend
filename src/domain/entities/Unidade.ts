import { StatusUnidade } from '../enums/StatusUnidade';

export interface UnidadeProps {
  id: string;
  nome: string;
  endereco: string;
  cnpj: string;
  telefone: string;
  status: StatusUnidade;
  criadoEm: Date;
}

export class Unidade {
  readonly id: string;
  readonly nome: string;
  readonly endereco: string;
  readonly cnpj: string;
  readonly telefone: string;
  readonly status: StatusUnidade;
  readonly criadoEm: Date;

  constructor(props: UnidadeProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.endereco = props.endereco;
    this.cnpj = props.cnpj;
    this.telefone = props.telefone;
    this.status = props.status;
    this.criadoEm = props.criadoEm;
  }

  isAtiva(): boolean {
    return this.status === StatusUnidade.ATIVA;
  }
}
