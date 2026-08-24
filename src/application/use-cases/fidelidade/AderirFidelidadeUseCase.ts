import { IFidelidadeRepository } from '../../../domain/repositories/IFidelidadeRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { ILogger } from '../../ports/ILogger';
import { ConflictError, RecursoNaoEncontradoError } from '../../../domain/errors/DomainErrors';
import { v4 as uuidv4 } from 'uuid';

export interface AderirFidelidadeInput {
  clienteId: string;
  consentimento: boolean; // RF-06.1 — opt-in explícito LGPD
  ip?: string;
}

export class AderirFidelidadeUseCase {
  constructor(
    private readonly fidelidadeRepository: IFidelidadeRepository,
    private readonly usuarioRepository: IUsuarioRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: AderirFidelidadeInput): Promise<{ fidelidadeId: string; pontosSaldo: number }> {
    if (!input.consentimento) {
      throw new ConflictError('É necessário consentir explicitamente para aderir ao programa de fidelidade (LGPD).');
    }

    const usuario = await this.usuarioRepository.buscarPorId(input.clienteId);
    if (!usuario) throw new RecursoNaoEncontradoError('Usuario', input.clienteId);

    const existente = await this.fidelidadeRepository.buscarPorClienteId(input.clienteId);
    if (existente) {
      throw new ConflictError('Usuário já está inscrito no programa de fidelidade.');
    }

    const fidelidade = await this.fidelidadeRepository.criar(input.clienteId, uuidv4());
    await this.usuarioRepository.atualizarFidelidadeOptIn(input.clienteId, true);

    this.logger.auditoria('FIDELIDADE_ADESAO', {
      usuarioId: input.clienteId,
      entidade: 'Fidelidade',
      entidadeId: fidelidade.id,
      ip: input.ip,
      extras: { consentimentoRegistrado: true },
    });

    return { fidelidadeId: fidelidade.id, pontosSaldo: fidelidade.pontosSaldo };
  }
}
