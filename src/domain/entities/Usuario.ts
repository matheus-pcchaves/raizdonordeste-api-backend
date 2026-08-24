import { Role } from '../enums/Role';

export interface UsuarioProps {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  role: Role;
  fidelidadeOptIn: boolean;
  ultimoLogin: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
  /** Indica se o usuário foi anonimizado por solicitação LGPD */
  anonimizado?: boolean;
}

/** Entidade de domínio Usuario — imutável após criação */
export class Usuario {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly senhaHash: string;
  readonly role: Role;
  readonly fidelidadeOptIn: boolean;
  readonly ultimoLogin: Date | null;
  readonly criadoEm: Date;
  readonly atualizadoEm: Date;
  readonly anonimizado: boolean;

  constructor(props: UsuarioProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.email = props.email;
    this.senhaHash = props.senhaHash;
    this.role = props.role;
    this.fidelidadeOptIn = props.fidelidadeOptIn;
    this.ultimoLogin = props.ultimoLogin;
    this.criadoEm = props.criadoEm;
    this.atualizadoEm = props.atualizadoEm;
    this.anonimizado = props.anonimizado ?? false;
  }

  isAdmin(): boolean {
    return this.role === Role.ADMIN;
  }

  isGerente(): boolean {
    return this.role === Role.GERENTE || this.role === Role.ADMIN;
  }

  isCliente(): boolean {
    return this.role === Role.CLIENTE;
  }

  hasRole(...roles: Role[]): boolean {
    return roles.includes(this.role);
  }
}
