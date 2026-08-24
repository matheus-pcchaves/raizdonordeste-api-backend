import { v4 as uuidv4 } from 'uuid';
import { IUnidadeRepository } from '../../../domain/repositories/IUnidadeRepository';
import { ILogger } from '../../ports/ILogger';
import { ConflictError } from '../../../domain/errors/DomainErrors';
import { StatusUnidade } from '../../../domain/enums/StatusUnidade';
import { Unidade } from '../../../domain/entities/Unidade';

export interface CriarUnidadeInput {
  nome: string;
  endereco: string;
  cnpj: string;
  telefone: string;
  adminId: string;
  ip?: string;
}

export class CriarUnidadeUseCase {
  constructor(
    private readonly unidadeRepository: IUnidadeRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: CriarUnidadeInput): Promise<Unidade> {
    const existente = await this.unidadeRepository.buscarPorCnpj(input.cnpj);
    if (existente) {
      throw new ConflictError(`CNPJ '${input.cnpj}' já está cadastrado.`);
    }

    const unidade = await this.unidadeRepository.criar({
      id: uuidv4(),
      nome: input.nome,
      endereco: input.endereco,
      cnpj: input.cnpj,
      telefone: input.telefone,
      status: StatusUnidade.ATIVA,
    });

    this.logger.auditoria('UNIDADE_CRIADA', {
      usuarioId: input.adminId,
      entidade: 'Unidade',
      entidadeId: unidade.id,
      ip: input.ip,
    });

    return unidade;
  }
}
