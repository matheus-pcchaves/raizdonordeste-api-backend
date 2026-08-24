import { Fidelidade, ExtratoFidelidade } from '../entities/Fidelidade';
import { TipoExtrato } from '../enums/TipoExtrato';

export interface RegistrarExtratoData {
  id: string;
  fidelidadeId: string;
  pedidoId: string | null;
  tipo: TipoExtrato;
  pontos: number;
  descricao: string;
}

export interface IFidelidadeRepository {
  criar(clienteId: string, id: string): Promise<Fidelidade>;
  buscarPorClienteId(clienteId: string): Promise<Fidelidade | null>;
  atualizarSaldo(fidelidadeId: string, novoSaldo: number): Promise<void>;
  registrarExtrato(data: RegistrarExtratoData): Promise<ExtratoFidelidade>;
  listarExtrato(
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<{ extratos: ExtratoFidelidade[]; total: number }>;
  expirarPontos(anteriorA: Date): Promise<number>;
}
