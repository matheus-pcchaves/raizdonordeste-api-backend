import { Request, Response, NextFunction } from 'express';
import { ITokenService, JwtPayload } from '../../application/ports/ITokenService';
import { Role } from '../../domain/enums/Role';
import { formatarErro } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}

/** Middleware de autenticação JWT */
export function authMiddleware(tokenService: ITokenService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json(
        formatarErro('TOKEN_INVALIDO', 'Token de autenticação não fornecido.', req.path),
      );
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json(
        formatarErro('TOKEN_INVALIDO', 'Token de autenticação inválido.', req.path),
      );
      return;
    }

    try {
      const payload = tokenService.verificarAccessToken(token);
      req.usuario = payload;
      next();
    } catch {
      res.status(401).json(
        formatarErro('TOKEN_INVALIDO', 'Token JWT inválido ou expirado.', req.path),
      );
    }
  };
}

/** Middleware de autorização por role (RBAC) */
export function rbacMiddleware(...rolesPermitidas: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = req.usuario;

    if (!usuario) {
      res.status(401).json(
        formatarErro('TOKEN_INVALIDO', 'Usuário não autenticado.', req.path),
      );
      return;
    }

    if (!rolesPermitidas.includes(usuario.role as Role)) {
      res.status(403).json(
        formatarErro(
          'PERMISSAO_NEGADA',
          `Acesso negado. Roles permitidas: ${rolesPermitidas.join(', ')}.`,
          req.path,
        ),
      );
      return;
    }

    next();
  };
}

/** Middleware de autenticação opcional (para pedidos anônimos no TOTEM) */
export function authOpcionalMiddleware(tokenService: ITokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      next();
      return;
    }

    try {
      req.usuario = tokenService.verificarAccessToken(token);
    } catch {
      // Token inválido em rota opcional → ignora e prossegue sem autenticação
    }

    next();
  };
}
