import { ICategoriaRepository } from '../../../domain/repositories/ICategoriaRepository';
import { Categoria } from '../../../domain/entities/Categoria';

export class InMemoryCategoriaRepository implements ICategoriaRepository {
  private categorias: Map<string, Categoria> = new Map();

  async criar(id: string, nome: string, descricao?: string): Promise<Categoria> {
    const categoria = new Categoria({ id, nome, descricao: descricao ?? null });
    this.categorias.set(id, categoria);
    return categoria;
  }

  async buscarPorId(id: string): Promise<Categoria | null> {
    return this.categorias.get(id) ?? null;
  }

  async listar(): Promise<Categoria[]> {
    return [...this.categorias.values()];
  }
}
