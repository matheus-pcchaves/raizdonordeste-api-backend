import { Unidade } from '../entities/Unidade';
import { StatusUnidade } from '../enums/StatusUnidade';

export interface CriarUnidadeData {
  id: string;
  nome: string;
  endereco: string;
  cnpj: string;
  telefone: string;
  status: StatusUnidade;
}

export interface IUnidadeRepository {
  criar(data: CriarUnidadeData): Promise<Unidade>;
  buscarPorId(id: string): Promise<Unidade | null>;
  buscarPorCnpj(cnpj: string): Promise<Unidade | null>;
  listar(page: number, limit: number, apenasAtivas?: boolean): Promise<{ unidades: Unidade[]; total: number }>;
  atualizar(id: string, data: Partial<CriarUnidadeData>): Promise<Unidade>;
  inativar(id: string): Promise<void>;
}
