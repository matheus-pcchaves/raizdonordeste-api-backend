import pino, { LoggerOptions } from 'pino';
import { ILogger } from '../../application/ports/ILogger';

const pinoOptions: LoggerOptions = {
  level: process.env['LOG_LEVEL'] ?? 'info',
  redact: {
    // LGPD: nunca logar dados pessoais em texto plano
    paths: ['*.email', '*.senha', '*.senhaHash', '*.cpf', '*.telefone', '*.token'],
    censor: '[REDACTED]',
  },
};

if (process.env['NODE_ENV'] === 'development') {
  pinoOptions.transport = { target: 'pino-pretty', options: { colorize: true } };
}

const pinoInstance = pino(pinoOptions);

export class PinoLogger implements ILogger {
  info(message: string, context?: Record<string, unknown>): void {
    pinoInstance.info(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    pinoInstance.warn(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    pinoInstance.error(context ?? {}, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    pinoInstance.debug(context ?? {}, message);
  }

  /**
   * Log de auditoria — registra ações sensíveis de forma estruturada.
   * NUNCA inclui dados pessoais (PII) — apenas IDs e metadados.
   */
  auditoria(
    acao: string,
    context: {
      usuarioId?: string;
      entidade: string;
      entidadeId?: string;
      ip?: string;
      extras?: Record<string, unknown>;
    },
  ): void {
    pinoInstance.info(
      {
        audit: true,
        acao,
        usuarioId: context.usuarioId,
        entidade: context.entidade,
        entidadeId: context.entidadeId,
        ip: context.ip,
        ...context.extras,
        timestamp: new Date().toISOString(),
      },
      `AUDITORIA: ${acao}`,
    );
  }
}
