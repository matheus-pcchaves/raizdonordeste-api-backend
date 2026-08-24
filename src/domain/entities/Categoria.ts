export interface CategoriaProps {
  id: string;
  nome: string;
  descricao: string | null;
}

export class Categoria {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string | null;

  constructor(props: CategoriaProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.descricao = props.descricao;
  }
}
