import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { ILogger } from '../../ports/ILogger';
import { Role } from '../../../domain/enums/Role';
import { ConflictError, PermissaoNegadaError } from '../../../domain/errors/DomainErrors';

const SALT_ROUNDS = Number(process.env['BCRYPT_SALT_ROUNDS'] ?? 10);

/** Roles que só GERENTE ou ADMIN podem criar */
const ROLES_RESTRITAS: Role[] = [Role.ATENDENTE, Role.COZINHA, Role.GERENTE, Role.ADMIN];

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  role: Role;
  /** Role do usuário que está criando (para validação RBAC) */
  roleRequisitante: Role;
  ip?: string;
}

export interface CriarUsuarioOutput {
  id: string;
  nome: string;
  email: string;
  role: Role;
}

export class CriarUsuarioUseCase {
  constructor(
    private readonly usuarioRepository: IUsuarioRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: CriarUsuarioInput): Promise<CriarUsuarioOutput> {
    // RF-01.5 — somente GERENTE ou ADMIN podem cadastrar atendentes, cozinheiros ou gerentes
    if (ROLES_RESTRITAS.includes(input.role)) {
      const podecriar =
        input.roleRequisitante === Role.GERENTE || input.roleRequisitante === Role.ADMIN;
      if (!podecriar) {
        throw new PermissaoNegadaError(`criar usuário com role ${input.role}`);
      }
    }

    const emailExiste = await this.usuarioRepository.existeEmail(input.email);
    if (emailExiste) {
      throw new ConflictError(`E-mail '${input.email}' já está em uso.`);
    }

    // RNF-01.1 — senha com bcrypt (custo ≥ 10)
    const senhaHash = await bcrypt.hash(input.senha, SALT_ROUNDS);

    const usuario = await this.usuarioRepository.criar({
      id: uuidv4(),
      nome: input.nome,
      email: input.email,
      senhaHash,
      role: input.role,
      fidelidadeOptIn: false,
    });

    this.logger.auditoria('USUARIO_CRIADO', {
      entidade: 'Usuario',
      entidadeId: usuario.id,
      ip: input.ip,
      extras: { role: input.role },
    });

    return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role };
  }
}
