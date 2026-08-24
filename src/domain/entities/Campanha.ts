import { TipoCampanha } from '../enums/TipoCampanha';

export interface CampanhaProps {
  id: string;
  nome: string;
  tipo: TipoCampanha;
  valor: number;
  unidadeId: string | null;
  dataInicio: Date;
  dataFim: Date;
  ativa: boolean;
  produtoIds: string[];
}

export class Campanha {
  readonly id: string;
  readonly nome: string;
  readonly tipo: TipoCampanha;
  readonly valor: number;
  readonly unidadeId: string | null;
  readonly dataInicio: Date;
  readonly dataFim: Date;
  readonly ativa: boolean;
  readonly produtoIds: string[];

  constructor(props: CampanhaProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.tipo = props.tipo;
    this.valor = props.valor;
    this.unidadeId = props.unidadeId;
    this.dataInicio = props.dataInicio;
    this.dataFim = props.dataFim;
    this.ativa = props.ativa;
    this.produtoIds = props.produtoIds;
  }

  estaAtiva(dataReferencia: Date = new Date()): boolean {
    return (
      this.ativa &&
      dataReferencia >= this.dataInicio &&
      dataReferencia <= this.dataFim
    );
  }

  aplicaAoProduto(produtoId: string): boolean {
    return this.produtoIds.includes(produtoId);
  }

  calcularDesconto(precoBase: number): number {
    if (this.tipo === TipoCampanha.PERCENTUAL) {
      return parseFloat(((precoBase * this.valor) / 100).toFixed(2));
    }
    // VALOR_FIXO — não pode ser maior que o preço base
    return Math.min(this.valor, precoBase);
  }
}
