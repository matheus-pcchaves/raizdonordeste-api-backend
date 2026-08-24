import jwt from 'jsonwebtoken';
import { ITokenService, JwtPayload } from '../ports/ITokenService';

export class TokenService implements ITokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor() {
    this.accessSecret = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';
    this.refreshSecret = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret-change-me';
    this.accessExpiresIn = process.env['JWT_EXPIRES_IN'] ?? '15m';
    this.refreshExpiresIn = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';
  }

  gerarAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign({ ...payload, type: 'access' }, this.accessSecret, {
      expiresIn: this.accessExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  gerarRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign({ ...payload, type: 'refresh' }, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verificarAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessSecret) as JwtPayload;
  }

  verificarRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.refreshSecret) as JwtPayload;
  }
}
