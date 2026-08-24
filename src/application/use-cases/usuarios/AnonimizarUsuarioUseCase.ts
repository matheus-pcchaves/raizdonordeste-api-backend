import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { ILogger } from '../../ports/ILogger';
import { RecursoNaoEncontradoError } from '../../../domain/errors/DomainErrors';

export interface AnonimizarUsuarioInput {
  usuarioId: string;
  requisitanteId: string;
  ip?: string;
}

/**
 * LGPD — RNF-01.4
 * Anonimiza nome, e-mail e demais dados pessoais do usuário.
 * O registro é mantido para auditoria financeira (pedidos históricos).
 */
export class AnonimizarUsuarioUseCase {
  constructor(
    private readonly usuarioRepository: IUsuarioRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: AnonimizarUsuarioInput): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw new RecursoNaoEncontradoError('Usuario', input.usuarioId);
    }

    await this.usuarioRepository.anonimizar(input.usuarioId);

    this.logger.auditoria('USUARIO_ANONIMIZADO_LGPD', {
      usuarioId: input.requisitanteId,
      entidade: 'Usuario',
      entidadeId: input.usuarioId,
      ip: input.ip,
    });
  }
}
