import { Estoque, MovimentacaoEstoque } from '../entities/Estoque';
import { TipoMovimentacaoEstoque } from '../enums/TipoMovimentacaoEstoque';

export interface RegistrarMovimentacaoData {
  id: string;
  estoqueId: string;
  usuarioId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  motivo: string;
}

export interface VerificarDisponibilidadeItem {
  produtoId: string;
  quantidade: number;
}

export interface IEstoqueRepository {
  buscarPorUnidadeEProduto(unidadeId: string, produtoId: string): Promise<Estoque | null>;
  listarPorUnidade(unidadeId: string, page: number, limit: number): Promise<{ estoques: Estoque[]; total: number }>;
  atualizar(estoqueId: string, quantidade: number): Promise<void>;
  registrarMovimentacao(data: RegistrarMovimentacaoData): Promise<MovimentacaoEstoque>;
  listarMovimentacoes(estoqueId: string, page: number, limit: number): Promise<{ movimentacoes: MovimentacaoEstoque[]; total: number }>;
  verificarDisponibilidadeMultiplos(
    unidadeId: string,
    itens: VerificarDisponibilidadeItem[],
  ): Promise<Array<{ produtoId: string; disponivel: boolean; quantidadeDisponivel: number }>>;
  criarSeNaoExistir(unidadeId: string, produtoId: string, unidadeMedida: string, quantidadeMinima: number): Promise<Estoque>;
}
