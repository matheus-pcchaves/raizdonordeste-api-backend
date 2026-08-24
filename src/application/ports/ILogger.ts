/** Port: serviço de logging estruturado */
export interface ILogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  /** Log de auditoria — ações sensíveis sem PII em texto plano */
  auditoria(acao: string, context: {
    usuarioId?: string;
    entidade: string;
    entidadeId?: string;
    ip?: string;
    extras?: Record<string, unknown>;
  }): void;
}
