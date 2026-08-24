import { ITokenService } from '../../ports/ITokenService';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { DomainError } from '../../../domain/errors/DomainErrors';

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly usuarioRepository: IUsuarioRepository,
  ) {}

  async execute(refreshToken: string): Promise<RefreshTokenOutput> {
    let payload;
    try {
      payload = this.tokenService.verificarRefreshToken(refreshToken);
    } catch {
      throw new DomainError('TOKEN_INVALIDO', 'Refresh token inválido ou expirado.');
    }

    const usuario = await this.usuarioRepository.buscarPorId(payload.sub);
    if (!usuario) {
      throw new DomainError('TOKEN_INVALIDO', 'Usuário não encontrado.');
    }

    const tokenPayload = { sub: usuario.id, email: usuario.email, role: usuario.role };
    return {
      accessToken: this.tokenService.gerarAccessToken(tokenPayload),
      refreshToken: this.tokenService.gerarRefreshToken(tokenPayload),
    };
  }
}
