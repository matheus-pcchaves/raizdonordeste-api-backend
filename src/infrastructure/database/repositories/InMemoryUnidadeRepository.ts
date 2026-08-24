import { IUnidadeRepository, CriarUnidadeData } from '../../../domain/repositories/IUnidadeRepository';
import { Unidade } from '../../../domain/entities/Unidade';
import { StatusUnidade } from '../../../domain/enums/StatusUnidade';

export class InMemoryUnidadeRepository implements IUnidadeRepository {
  private unidades: Map<string, Unidade> = new Map();

  async criar(data: CriarUnidadeData): Promise<Unidade> {
    const unidade = new Unidade({ ...data, criadoEm: new Date() });
    this.unidades.set(data.id, unidade);
    return unidade;
  }

  async buscarPorId(id: string): Promise<Unidade | null> {
    return this.unidades.get(id) ?? null;
  }

  async buscarPorCnpj(cnpj: string): Promise<Unidade | null> {
    for (const u of this.unidades.values()) {
      if (u.cnpj === cnpj) return u;
    }
    return null;
  }

  async listar(page: number, limit: number, apenasAtivas = false): Promise<{ unidades: Unidade[]; total: number }> {
    let todas = [...this.unidades.values()];
    if (apenasAtivas) todas = todas.filter((u) => u.status === StatusUnidade.ATIVA);
    const total = todas.length;
    return { unidades: todas.slice((page - 1) * limit, page * limit), total };
  }

  async atualizar(id: string, data: Partial<CriarUnidadeData>): Promise<Unidade> {
    const u = this.unidades.get(id);
    if (!u) throw new Error(`Unidade ${id} não encontrada`);
    const atualizada = new Unidade({ ...u, ...data });
    this.unidades.set(id, atualizada);
    return atualizada;
  }

  async inativar(id: string): Promise<void> {
    const u = this.unidades.get(id);
    if (u) {
      this.unidades.set(id, new Unidade({ ...u, status: StatusUnidade.INATIVA }));
    }
  }
}
