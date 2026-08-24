import bcrypt from 'bcryptjs';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { ITokenService } from '../../ports/ITokenService';
import { ILogger } from '../../ports/ILogger';
import { DomainError } from '../../../domain/errors/DomainErrors';

export interface LoginInput {
  email: string;
  senha: string;
  ip?: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: string;
  };
}

export class LoginUseCase {
  constructor(
    private readonly usuarioRepository: IUsuarioRepository,
    private readonly tokenService: ITokenService,
    private readonly logger: ILogger,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const usuario = await this.usuarioRepository.buscarPorEmail(input.email);

    if (!usuario) {
      // Evitar enumeração de usuários — mesma mensagem para email ou senha errada
      throw new DomainError('CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
    }

    const senhaCorreta = await bcrypt.compare(input.senha, usuario.senhaHash);
    if (!senhaCorreta) {
      throw new DomainError('CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
    }

    await this.usuarioRepository.atualizarUltimoLogin(usuario.id);

    const tokenPayload = { sub: usuario.id, email: usuario.email, role: usuario.role };
    const accessToken = this.tokenService.gerarAccessToken(tokenPayload);
    const refreshToken = this.tokenService.gerarRefreshToken(tokenPayload);

    this.logger.auditoria('LOGIN', {
      usuarioId: usuario.id,
      entidade: 'Usuario',
      entidadeId: usuario.id,
      ip: input.ip,
    });

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    };
  }
}
