import { Usuario } from '../entities/Usuario';
import { Role } from '../enums/Role';

export interface CriarUsuarioData {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  role: Role;
  fidelidadeOptIn?: boolean;
}

export interface IUsuarioRepository {
  criar(data: CriarUsuarioData): Promise<Usuario>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  listar(page: number, limit: number): Promise<{ usuarios: Usuario[]; total: number }>;
  atualizarUltimoLogin(id: string): Promise<void>;
  atualizarFidelidadeOptIn(id: string, optIn: boolean): Promise<void>;
  anonimizar(id: string): Promise<void>;
  existeEmail(email: string): Promise<boolean>;
}
