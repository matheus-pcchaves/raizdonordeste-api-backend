import { IUsuarioRepository, CriarUsuarioData } from '../../../domain/repositories/IUsuarioRepository';
import { Usuario } from '../../../domain/entities/Usuario';
import { Role } from '../../../domain/enums/Role';

export class InMemoryUsuarioRepository implements IUsuarioRepository {
  private usuarios: Map<string, Usuario> = new Map();

  async criar(data: CriarUsuarioData): Promise<Usuario> {
    const usuario = new Usuario({
      id: data.id,
      nome: data.nome,
      email: data.email,
      senhaHash: data.senhaHash,
      role: data.role,
      fidelidadeOptIn: data.fidelidadeOptIn ?? false,
      ultimoLogin: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });
    this.usuarios.set(data.id, usuario);
    return usuario;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.usuarios.get(id) ?? null;
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    for (const u of this.usuarios.values()) {
      if (u.email === email && !u.anonimizado) return u;
    }
    return null;
  }

  async listar(page: number, limit: number): Promise<{ usuarios: Usuario[]; total: number }> {
    const todos = [...this.usuarios.values()];
    const total = todos.length;
    const usuarios = todos.slice((page - 1) * limit, page * limit);
    return { usuarios, total };
  }

  async atualizarUltimoLogin(id: string): Promise<void> {
    const u = this.usuarios.get(id);
    if (u) {
      const atualizado = new Usuario({
        ...u,
        ultimoLogin: new Date(),
        atualizadoEm: new Date(),
      });
      this.usuarios.set(id, atualizado);
    }
  }

  async atualizarFidelidadeOptIn(id: string, optIn: boolean): Promise<void> {
    const u = this.usuarios.get(id);
    if (u) {
      const atualizado = new Usuario({
        ...u,
        fidelidadeOptIn: optIn,
        atualizadoEm: new Date(),
      });
      this.usuarios.set(id, atualizado);
    }
  }

  async anonimizar(id: string): Promise<void> {
    const u = this.usuarios.get(id);
    if (u) {
      const anonimizado = new Usuario({
        ...u,
        nome: '[ANONIMIZADO]',
        email: `anonimizado-${id}@lgpd.local`,
        senhaHash: '',
        anonimizado: true,
        atualizadoEm: new Date(),
      });
      this.usuarios.set(id, anonimizado);
    }
  }

  async existeEmail(email: string): Promise<boolean> {
    for (const u of this.usuarios.values()) {
      if (u.email === email && !u.anonimizado) return true;
    }
    return false;
  }
}
