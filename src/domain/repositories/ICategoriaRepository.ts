import { Categoria } from '../entities/Categoria';

export interface ICategoriaRepository {
  criar(id: string, nome: string, descricao?: string): Promise<Categoria>;
  buscarPorId(id: string): Promise<Categoria | null>;
  listar(): Promise<Categoria[]>;
}
