import { IFidelidadeRepository } from '../../domain/repositories/IFidelidadeRepository';
import { ILogger } from '../ports/ILogger';
import { TipoExtrato } from '../../domain/enums/TipoExtrato';
import { FidelidadeNaoAtivaError, SaldoPontosInsuficienteError } from '../../domain/errors/DomainErrors';
import { v4 as uuidv4 } from 'uuid';

const PONTOS_POR_REAL = Number(process.env['FIDELIDADE_PONTOS_POR_REAL'] ?? 1);
const VALOR_POR_100_PONTOS = Number(process.env['FIDELIDADE_VALOR_POR_100_PONTOS'] ?? 5);

export class FidelidadeService {
  constructor(
    private readonly fidelidadeRepository: IFidelidadeRepository,
    private readonly logger: ILogger,
  ) {}

  calcularPontosGanhos(valorPedido: number): number {
    return Math.floor(valorPedido * PONTOS_POR_REAL);
  }

  calcularDescontoEmReais(pontos: number): number {
    return parseFloat(((pontos / 100) * VALOR_POR_100_PONTOS).toFixed(2));
  }

  async acumularPontos(clienteId: string, valorPedido: number, pedidoId: string): Promise<void> {
    const fidelidade = await this.fidelidadeRepository.buscarPorClienteId(clienteId);
    if (!fidelidade) return; // cliente não aderiu

    const pontos = this.calcularPontosGanhos(valorPedido);
    if (pontos <= 0) return;

    fidelidade.acumular(pontos);
    await this.fidelidadeRepository.atualizarSaldo(fidelidade.id, fidelidade.pontosSaldo);
    await this.fidelidadeRepository.registrarExtrato({
      id: uuidv4(),
      fidelidadeId: fidelidade.id,
      pedidoId,
      tipo: TipoExtrato.ACUMULO,
      pontos,
      descricao: `Acúmulo por pedido #${pedidoId}`,
    });

    this.logger.auditoria('FIDELIDADE_ACUMULO', {
      usuarioId: clienteId,
      entidade: 'Fidelidade',
      entidadeId: fidelidade.id,
      extras: { pontos, pedidoId },
    });
  }

  async validarECalcularResgate(
    clienteId: string,
    pontosSolicitados: number,
  ): Promise<number> {
    const fidelidade = await this.fidelidadeRepository.buscarPorClienteId(clienteId);
    if (!fidelidade) throw new FidelidadeNaoAtivaError();
    if (!fidelidade.verificarSaldo(pontosSolicitados)) {
      throw new SaldoPontosInsuficienteError(fidelidade.pontosSaldo, pontosSolicitados);
    }
    return this.calcularDescontoEmReais(pontosSolicitados);
  }

  async executarResgate(
    clienteId: string,
    pontosSolicitados: number,
    pedidoId: string,
  ): Promise<void> {
    const fidelidade = await this.fidelidadeRepository.buscarPorClienteId(clienteId);
    if (!fidelidade) throw new FidelidadeNaoAtivaError();

    fidelidade.resgatar(pontosSolicitados);
    await this.fidelidadeRepository.atualizarSaldo(fidelidade.id, fidelidade.pontosSaldo);
    await this.fidelidadeRepository.registrarExtrato({
      id: uuidv4(),
      fidelidadeId: fidelidade.id,
      pedidoId,
      tipo: TipoExtrato.RESGATE,
      pontos: -pontosSolicitados,
      descricao: `Resgate no pedido #${pedidoId}`,
    });

    this.logger.auditoria('FIDELIDADE_RESGATE', {
      usuarioId: clienteId,
      entidade: 'Fidelidade',
      entidadeId: fidelidade.id,
      extras: { pontos: pontosSolicitados, pedidoId },
    });
  }
}
