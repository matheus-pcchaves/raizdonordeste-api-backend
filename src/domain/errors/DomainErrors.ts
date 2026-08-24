/** Erro base de negócio — sempre inclui um código de erro tipado */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ campo?: string; msg: string }>,
  ) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Produto ou ingrediente sem estoque suficiente para atender o pedido */
export class EstoqueInsuficienteError extends DomainError {
  constructor(nomeProduto: string, disponivel: number, solicitado: number) {
    super(
      'ESTOQUE_INSUFICIENTE',
      `Produto '${nomeProduto}' não possui estoque suficiente.`,
      [{ msg: `Estoque disponível: ${disponivel}, solicitado: ${solicitado}` }],
    );
    this.name = 'EstoqueInsuficienteError';
  }
}

/** Produto está marcado como INDISPONIVEL no cardápio */
export class ProdutoIndisponivelError extends DomainError {
  constructor(nomeProduto: string) {
    super(
      'PRODUTO_INDISPONIVEL',
      `Produto '${nomeProduto}' está indisponível no momento.`,
    );
    this.name = 'ProdutoIndisponivelError';
  }
}

/** Transição de status do pedido não é permitida pela máquina de estados */
export class TransicaoStatusInvalidaError extends DomainError {
  constructor(statusAtual: string, statusDestino: string) {
    super(
      'TRANSICAO_STATUS_INVALIDA',
      `Não é possível transitar o pedido de '${statusAtual}' para '${statusDestino}'.`,
    );
    this.name = 'TransicaoStatusInvalidaError';
  }
}

/** Cliente não possui saldo de pontos suficiente para o resgate solicitado */
export class SaldoPontosInsuficienteError extends DomainError {
  constructor(saldo: number, solicitado: number) {
    super(
      'SALDO_PONTOS_INSUFICIENTE',
      `Saldo de pontos insuficiente. Saldo atual: ${saldo}, solicitado: ${solicitado}.`,
    );
    this.name = 'SaldoPontosInsuficienteError';
  }
}

/** Pagamento foi recusado pelo gateway mock */
export class PagamentoNegadoError extends DomainError {
  constructor(
    public readonly payload: Record<string, unknown>,
    motivo?: string,
  ) {
    super(
      'PAGAMENTO_NEGADO',
      motivo ?? 'Pagamento negado pelo gateway.',
    );
    this.name = 'PagamentoNegadoError';
  }
}

/** Gateway de pagamento não respondeu dentro do timeout */
export class PagamentoPendenteError extends DomainError {
  constructor(pedidoId: string) {
    super(
      'PAGAMENTO_PENDENTE',
      `Pagamento do pedido '${pedidoId}' está aguardando confirmação. Tente novamente em instantes.`,
    );
    this.name = 'PagamentoPendenteError';
  }
}

/** Usuário não possui permissão para a operação */
export class PermissaoNegadaError extends DomainError {
  constructor(acao?: string) {
    super(
      'PERMISSAO_NEGADA',
      acao
        ? `Você não tem permissão para realizar a operação: ${acao}.`
        : 'Você não tem permissão para realizar esta operação.',
    );
    this.name = 'PermissaoNegadaError';
  }
}

/** Recurso não encontrado no sistema */
export class RecursoNaoEncontradoError extends DomainError {
  constructor(recurso: string, id?: string) {
    super(
      'RECURSO_NAO_ENCONTRADO',
      id
        ? `${recurso} com id '${id}' não encontrado.`
        : `${recurso} não encontrado.`,
    );
    this.name = 'RecursoNaoEncontradoError';
  }
}

/** Conflito de regra de negócio (ex.: e-mail já cadastrado, CNPJ duplicado) */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super('CONFLICT', message);
    this.name = 'ConflictError';
  }
}

/** Campo obrigatório ausente ou com valor inválido */
export class ValidationError extends DomainError {
  constructor(details: Array<{ campo?: string; msg: string }>) {
    super(
      'VALIDATION_ERROR',
      'Dados de entrada inválidos.',
      details,
    );
    this.name = 'ValidationError';
  }
}

/** Cliente não está inscrito no programa de fidelidade */
export class FidelidadeNaoAtivaError extends DomainError {
  constructor() {
    super(
      'FIDELIDADE_NAO_ATIVA',
      'Você não está inscrito no programa de fidelidade. Utilize POST /fidelidade/aderir para participar.',
    );
    this.name = 'FidelidadeNaoAtivaError';
  }
}

/** Unidade está inativa e não aceita novos pedidos */
export class UnidadeInativaError extends DomainError {
  constructor(unidadeId: string) {
    super(
      'UNIDADE_INATIVA',
      `A unidade '${unidadeId}' está inativa e não aceita novos pedidos.`,
    );
    this.name = 'UnidadeInativaError';
  }
}
