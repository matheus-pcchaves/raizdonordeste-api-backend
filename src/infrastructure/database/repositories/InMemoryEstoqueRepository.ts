import { IEstoqueRepository, RegistrarMovimentacaoData, VerificarDisponibilidadeItem } from '../../../domain/repositories/IEstoqueRepository';
import { Estoque, MovimentacaoEstoque } from '../../../domain/entities/Estoque';

export class InMemoryEstoqueRepository implements IEstoqueRepository {
  private estoques: Map<string, Estoque> = new Map();
  private movimentacoes: MovimentacaoEstoque[] = [];

  async buscarPorUnidadeEProduto(unidadeId: string, produtoId: string): Promise<Estoque | null> {
    for (const e of this.estoques.values()) {
      if (e.unidadeId === unidadeId && e.produtoId === produtoId) return e;
    }
    return null;
  }

  async listarPorUnidade(unidadeId: string, page: number, limit: number): Promise<{ estoques: Estoque[]; total: number }> {
    const todos = [...this.estoques.values()].filter((e) => e.unidadeId === unidadeId);
    return { estoques: todos.slice((page - 1) * limit, page * limit), total: todos.length };
  }

  async atualizar(estoqueId: string, quantidade: number): Promise<void> {
    const e = this.estoques.get(estoqueId);
    if (e) {
      this.estoques.set(estoqueId, new Estoque({
        id: e.id,
        unidadeId: e.unidadeId,
        produtoId: e.produtoId,
        quantidade,
        unidadeMedida: e.unidadeMedida,
        quantidadeMinima: e.quantidadeMinima,
        atualizadoEm: new Date(),
      }));
    }
  }

  async registrarMovimentacao(data: RegistrarMovimentacaoData): Promise<MovimentacaoEstoque> {
    const mov = new MovimentacaoEstoque({ ...data, criadoEm: new Date() });
    this.movimentacoes.push(mov);
    return mov;
  }

  async listarMovimentacoes(estoqueId: string, page: number, limit: number): Promise<{ movimentacoes: MovimentacaoEstoque[]; total: number }> {
    const todos = this.movimentacoes.filter((m) => m.estoqueId === estoqueId);
    return { movimentacoes: todos.slice((page - 1) * limit, page * limit), total: todos.length };
  }

  async verificarDisponibilidadeMultiplos(
    unidadeId: string,
    itens: VerificarDisponibilidadeItem[],
  ): Promise<Array<{ produtoId: string; disponivel: boolean; quantidadeDisponivel: number }>> {
    return itens.map((item) => {
      let quantidadeDisponivel = 999; // padrão: disponível
      for (const e of this.estoques.values()) {
        if (e.unidadeId === unidadeId && e.produtoId === item.produtoId) {
          quantidadeDisponivel = e.quantidade;
          break;
        }
      }
      return {
        produtoId: item.produtoId,
        disponivel: quantidadeDisponivel >= item.quantidade,
        quantidadeDisponivel,
      };
    });
  }

  async criarSeNaoExistir(
    unidadeId: string,
    produtoId: string,
    unidadeMedida: string,
    quantidadeMinima: number,
  ): Promise<Estoque> {
    const existente = await this.buscarPorUnidadeEProduto(unidadeId, produtoId);
    if (existente) return existente;

    const novo = new Estoque({
      id: `${unidadeId}-${produtoId}`,
      unidadeId,
      produtoId,
      quantidade: 0,
      unidadeMedida,
      quantidadeMinima,
      atualizadoEm: new Date(),
    });
    this.estoques.set(novo.id, novo);
    return novo;
  }
}
