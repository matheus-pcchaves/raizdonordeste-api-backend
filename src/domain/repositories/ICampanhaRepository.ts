import { Campanha } from '../entities/Campanha';

export interface CriarCampanhaData {
  id: string;
  nome: string;
  tipo: string;
  valor: number;
  unidadeId: string | null;
  dataInicio: Date;
  dataFim: Date;
  ativa: boolean;
  produtoIds: string[];
}

export interface ICampanhaRepository {
  criar(data: CriarCampanhaData): Promise<Campanha>;
  buscarPorId(id: string): Promise<Campanha | null>;
  listarAtivas(unidadeId?: string): Promise<Campanha[]>;
  listar(page: number, limit: number): Promise<{ campanhas: Campanha[]; total: number }>;
  atualizar(id: string, data: Partial<CriarCampanhaData>): Promise<Campanha>;
  remover(id: string): Promise<void>;
}
