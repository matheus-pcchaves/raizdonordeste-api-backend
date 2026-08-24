import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { DomainError } from '../../domain/errors/DomainErrors';

/** Formata resposta de erro padronizada para todas as falhas */
export function formatarErro(
  code: string,
  message: string,
  path: string,
  details?: Array<{ campo?: string; msg: string }>,
) {
  return {
    error: {
      code,
      message,
      details: details ?? [],
      timestamp: new Date().toISOString(),
      path,
    },
  };
}

/** Middleware global de tratamento de erros */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const path = req.path;

  // Erros de validação Zod
  if (err instanceof ZodError) {
    res.status(422).json(
      formatarErro(
        'VALIDATION_ERROR',
        'Dados de entrada inválidos.',
        path,
        err.errors.map((e) => ({ campo: e.path.join('.'), msg: e.message })),
      ),
    );
    return;
  }

  // Erros de domínio tipados
  if (err instanceof DomainError) {
    const statusMap: Record<string, number> = {
      CREDENCIAIS_INVALIDAS: 401,
      TOKEN_INVALIDO: 401,
      PERMISSAO_NEGADA: 403,
      RECURSO_NAO_ENCONTRADO: 404,
      CONFLICT: 409,
      ESTOQUE_INSUFICIENTE: 422,
      PRODUTO_INDISPONIVEL: 422,
      SALDO_PONTOS_INSUFICIENTE: 422,
      TRANSICAO_STATUS_INVALIDA: 422,
      FIDELIDADE_NAO_ATIVA: 422,
      UNIDADE_INATIVA: 422,
      VALIDATION_ERROR: 422,
      PAGAMENTO_NEGADO: 402,
      PAGAMENTO_PENDENTE: 202,
    };

    const status = statusMap[err.code] ?? 400;
    res.status(status).json(
      formatarErro(err.code, err.message, path, err.details),
    );
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json(
      formatarErro('TOKEN_INVALIDO', 'Token JWT inválido ou expirado.', path),
    );
    return;
  }

  // Erro genérico — não expõe stack em produção
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json(
    formatarErro(
      'INTERNAL_ERROR',
      process.env['NODE_ENV'] === 'development' ? err.message : 'Erro interno do servidor.',
      path,
    ),
  );
}

/** Middleware de validação de schema Zod — body */
export function validarBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Middleware de validação de schema Zod — query params */
export function validarQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
