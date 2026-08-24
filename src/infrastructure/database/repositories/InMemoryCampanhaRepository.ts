import { ICampanhaRepository, CriarCampanhaData } from '../../../domain/repositories/ICampanhaRepository';
import { Campanha } from '../../../domain/entities/Campanha';
import { TipoCampanha } from '../../../domain/enums/TipoCampanha';

export class InMemoryCampanhaRepository implements ICampanhaRepository {
  private campanhas: Map<string, Campanha> = new Map();

  async criar(data: CriarCampanhaData): Promise<Campanha> {
    const campanha = new Campanha({
      ...data,
      tipo: data.tipo as TipoCampanha,
    });
    this.campanhas.set(data.id, campanha);
    return campanha;
  }

  async buscarPorId(id: string): Promise<Campanha | null> {
    return this.campanhas.get(id) ?? null;
  }

  async listarAtivas(unidadeId?: string): Promise<Campanha[]> {
    const agora = new Date();
    return [...this.campanhas.values()].filter((c) => {
      if (!c.estaAtiva(agora)) return false;
      if (unidadeId && c.unidadeId && c.unidadeId !== unidadeId) return false;
      return true;
    });
  }

  async listar(page: number, limit: number): Promise<{ campanhas: Campanha[]; total: number }> {
    const todas = [...this.campanhas.values()];
    return { campanhas: todas.slice((page - 1) * limit, page * limit), total: todas.length };
  }

  async atualizar(id: string, data: Partial<CriarCampanhaData>): Promise<Campanha> {
    const c = this.campanhas.get(id);
    if (!c) throw new Error(`Campanha ${id} não encontrada`);
    const atualizada = new Campanha({ ...c, ...data, tipo: (data.tipo as TipoCampanha) ?? c.tipo });
    this.campanhas.set(id, atualizada);
    return atualizada;
  }

  async remover(id: string): Promise<void> {
    this.campanhas.delete(id);
  }
}
