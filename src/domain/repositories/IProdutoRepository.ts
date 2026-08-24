import { Produto } from '../entities/Produto';
import { StatusProduto } from '../enums/StatusProduto';

export interface CriarProdutoData {
  id: string;
  nome: string;
  descricao?: string | null;
  precoBase: number;
  imagemUrl?: string | null;
  status: StatusProduto;
  categoriaId: string;
}

export interface ItemCardapioUnidade {
  produtoId: string;
  nomeProduto: string;
  descricao: string | null;
  precoBase: number;
  precoEspecifico: number | null;
  imagemUrl: string | null;
  status: StatusProduto;
  categoriaId: string;
  categoriaNome: string;
  ativo: boolean;
}

export interface IProdutoRepository {
  criar(data: CriarProdutoData): Promise<Produto>;
  buscarPorId(id: string): Promise<Produto | null>;
  listar(page: number, limit: number, categoriaId?: string): Promise<{ produtos: Produto[]; total: number }>;
  atualizar(id: string, data: Partial<CriarProdutoData>): Promise<Produto>;
  remover(id: string): Promise<void>;
  atualizarStatus(id: string, status: StatusProduto): Promise<void>;

  // Cardápio por unidade
  adicionarAoCardapio(unidadeId: string, produtoId: string, precoEspecifico?: number): Promise<void>;
  removerDoCardapio(unidadeId: string, produtoId: string): Promise<void>;
  buscarCardapioUnidade(
    unidadeId: string,
    filtros?: { categoriaId?: string; apenasDisponiveis?: boolean },
    page?: number,
    limit?: number,
  ): Promise<{ itens: ItemCardapioUnidade[]; total: number }>;
  atualizarItemCardapio(
    unidadeId: string,
    produtoId: string,
    dados: { precoEspecifico?: number; ativo?: boolean },
  ): Promise<void>;
}
