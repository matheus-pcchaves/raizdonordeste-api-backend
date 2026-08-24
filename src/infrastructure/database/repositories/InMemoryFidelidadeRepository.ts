import { IFidelidadeRepository, RegistrarExtratoData } from '../../../domain/repositories/IFidelidadeRepository';
import { Fidelidade, ExtratoFidelidade } from '../../../domain/entities/Fidelidade';

export class InMemoryFidelidadeRepository implements IFidelidadeRepository {
  private fidelidades: Map<string, Fidelidade> = new Map();
  private extratos: ExtratoFidelidade[] = [];

  async criar(clienteId: string, id: string): Promise<Fidelidade> {
    const fidelidade = new Fidelidade({ id, clienteId, pontosSaldo: 0, atualizadoEm: new Date() });
    this.fidelidades.set(clienteId, fidelidade);
    return fidelidade;
  }

  async buscarPorClienteId(clienteId: string): Promise<Fidelidade | null> {
    return this.fidelidades.get(clienteId) ?? null;
  }

  async atualizarSaldo(fidelidadeId: string, novoSaldo: number): Promise<void> {
    for (const [key, f] of this.fidelidades.entries()) {
      if (f.id === fidelidadeId) {
        this.fidelidades.set(key, new Fidelidade({ ...f, pontosSaldo: novoSaldo, atualizadoEm: new Date() }));
        break;
      }
    }
  }

  async registrarExtrato(data: RegistrarExtratoData): Promise<ExtratoFidelidade> {
    const extrato = new ExtratoFidelidade({ ...data, criadoEm: new Date() });
    this.extratos.push(extrato);
    return extrato;
  }

  async listarExtrato(clienteId: string, page: number, limit: number): Promise<{ extratos: ExtratoFidelidade[]; total: number }> {
    const fidelidade = this.fidelidades.get(clienteId);
    if (!fidelidade) return { extratos: [], total: 0 };
    const todos = this.extratos.filter((e) => e.fidelidadeId === fidelidade.id);
    return { extratos: todos.slice((page - 1) * limit, page * limit), total: todos.length };
  }

  async expirarPontos(_anteriorA: Date): Promise<number> {
    return 0; // implementação simplificada
  }
}
