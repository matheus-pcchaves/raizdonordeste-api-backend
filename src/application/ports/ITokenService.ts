import { Role } from '../../domain/enums/Role';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/** Port: serviço de geração/validação de JWT */
export interface ITokenService {
  gerarAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
  gerarRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
  verificarAccessToken(token: string): JwtPayload;
  verificarRefreshToken(token: string): JwtPayload;
}
