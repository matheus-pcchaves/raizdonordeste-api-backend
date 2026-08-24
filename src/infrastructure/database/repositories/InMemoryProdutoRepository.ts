import {
  IProdutoRepository,
  CriarProdutoData,
  ItemCardapioUnidade,
} from '../../../domain/repositories/IProdutoRepository';
import { Produto } from '../../../domain/entities/Produto';
import { StatusProduto } from '../../../domain/enums/StatusProduto';

interface CardapioEntry {
  unidadeId: string;
  produtoId: string;
  precoEspecifico: number | null;
  ativo: boolean;
}

export class InMemoryProdutoRepository implements IProdutoRepository {
  private produtos: Map<string, Produto> = new Map();
  private cardapios: CardapioEntry[] = [];

  async criar(data: CriarProdutoData): Promise<Produto> {
    const produto = new Produto({
      id: data.id,
      nome: data.nome,
      descricao: data.descricao ?? null,
      precoBase: data.precoBase,
      imagemUrl: data.imagemUrl ?? null,
      status: data.status,
      categoriaId: data.categoriaId,
      criadoEm: new Date(),
    });
    this.produtos.set(data.id, produto);
    return produto;
  }

  async buscarPorId(id: string): Promise<Produto | null> {
    return this.produtos.get(id) ?? null;
  }

  async listar(
    page: number,
    limit: number,
    categoriaId?: string,
  ): Promise<{ produtos: Produto[]; total: number }> {
    let todos = [...this.produtos.values()];
    if (categoriaId) todos = todos.filter((p) => p.categoriaId === categoriaId);
    return {
      produtos: todos.slice((page - 1) * limit, page * limit),
      total: todos.length,
    };
  }

  async atualizar(id: string, data: Partial<CriarProdutoData>): Promise<Produto> {
    const p = this.produtos.get(id);
    if (!p) throw new Error(`Produto ${id} não encontrado`);
    const atualizado = new Produto({
      id: p.id,
      nome: data.nome ?? p.nome,
      descricao: data.descricao !== undefined ? (data.descricao ?? null) : p.descricao,
      precoBase: data.precoBase ?? p.precoBase,
      imagemUrl: data.imagemUrl !== undefined ? (data.imagemUrl ?? null) : p.imagemUrl,
      status: data.status ?? p.status,
      categoriaId: data.categoriaId ?? p.categoriaId,
      criadoEm: p.criadoEm,
    });
    this.produtos.set(id, atualizado);
    return atualizado;
  }

  async remover(id: string): Promise<void> {
    this.produtos.delete(id);
  }

  async atualizarStatus(id: string, status: StatusProduto): Promise<void> {
    const p = this.produtos.get(id);
    if (p) {
      if (status === StatusProduto.INDISPONIVEL) p.marcarIndisponivel();
      else p.marcarDisponivel();
    }
  }

  async adicionarAoCardapio(
    unidadeId: string,
    produtoId: string,
    precoEspecifico?: number,
  ): Promise<void> {
    const idx = this.cardapios.findIndex(
      (c) => c.unidadeId === unidadeId && c.produtoId === produtoId,
    );
    if (idx >= 0) {
      this.cardapios[idx] = { unidadeId, produtoId, precoEspecifico: precoEspecifico ?? null, ativo: true };
    } else {
      this.cardapios.push({ unidadeId, produtoId, precoEspecifico: precoEspecifico ?? null, ativo: true });
    }
  }

  async removerDoCardapio(unidadeId: string, produtoId: string): Promise<void> {
    this.cardapios = this.cardapios.filter(
      (c) => !(c.unidadeId === unidadeId && c.produtoId === produtoId),
    );
  }

  async buscarCardapioUnidade(
    unidadeId: string,
    filtros?: { categoriaId?: string; apenasDisponiveis?: boolean },
    page = 1,
    limit = 20,
  ): Promise<{ itens: ItemCardapioUnidade[]; total: number }> {
    let entries = this.cardapios.filter((c) => c.unidadeId === unidadeId && c.ativo);

    const itens: ItemCardapioUnidade[] = [];
    for (const entry of entries) {
      const produto = this.produtos.get(entry.produtoId);
      if (!produto) continue;
      if (filtros?.categoriaId && produto.categoriaId !== filtros.categoriaId) continue;
      if (filtros?.apenasDisponiveis && !produto.isDisponivel()) continue;
      itens.push({
        produtoId: produto.id,
        nomeProduto: produto.nome,
        descricao: produto.descricao,
        precoBase: produto.precoBase,
        precoEspecifico: entry.precoEspecifico,
        imagemUrl: produto.imagemUrl,
        status: produto.status,
        categoriaId: produto.categoriaId,
        categoriaNome: produto.categoriaId, // simplificado; Prisma faz o join
        ativo: entry.ativo,
      });
    }

    return { itens: itens.slice((page - 1) * limit, page * limit), total: itens.length };
  }

  async atualizarItemCardapio(
    unidadeId: string,
    produtoId: string,
    dados: { precoEspecifico?: number; ativo?: boolean },
  ): Promise<void> {
    const entry = this.cardapios.find(
      (c) => c.unidadeId === unidadeId && c.produtoId === produtoId,
    );
    if (entry) {
      if (dados.precoEspecifico !== undefined) entry.precoEspecifico = dados.precoEspecifico;
      if (dados.ativo !== undefined) entry.ativo = dados.ativo;
    }
  }
}
