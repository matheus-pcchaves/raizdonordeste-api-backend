import { Fidelidade } from '../../../domain/entities/Fidelidade';
import { SaldoPontosInsuficienteError } from '../../../domain/errors/DomainErrors';

const criarFidelidade = (pontos = 100) =>
  new Fidelidade({ id: 'fid-1', clienteId: 'cli-1', pontosSaldo: pontos, atualizadoEm: new Date() });

describe('Fidelidade — entidade de domínio', () => {
  test('acumular aumenta o saldo de pontos', () => {
    const fidelidade = criarFidelidade(100);
    fidelidade.acumular(50);
    expect(fidelidade.pontosSaldo).toBe(150);
  });

  test('resgatar diminui o saldo de pontos', () => {
    const fidelidade = criarFidelidade(100);
    fidelidade.resgatar(30);
    expect(fidelidade.pontosSaldo).toBe(70);
  });

  test('resgatar lança SaldoPontosInsuficienteError quando saldo é insuficiente', () => {
    const fidelidade = criarFidelidade(20);
    expect(() => fidelidade.resgatar(100)).toThrow(SaldoPontosInsuficienteError);
  });

  test('verificarSaldo retorna true quando há saldo suficiente', () => {
    const fidelidade = criarFidelidade(100);
    expect(fidelidade.verificarSaldo(100)).toBe(true);
  });

  test('verificarSaldo retorna false quando saldo é insuficiente', () => {
    const fidelidade = criarFidelidade(50);
    expect(fidelidade.verificarSaldo(100)).toBe(false);
  });

  test('calcularPontosGanhos com ratio padrão (1 ponto/real)', () => {
    const fidelidade = criarFidelidade();
    expect(fidelidade.calcularPontosGanhos(99.90)).toBe(99);
    expect(fidelidade.calcularPontosGanhos(100)).toBe(100);
    expect(fidelidade.calcularPontosGanhos(0.50)).toBe(0);
  });

  test('acumular lança erro para pontos <= 0', () => {
    const fidelidade = criarFidelidade(100);
    expect(() => fidelidade.acumular(0)).toThrow();
    expect(() => fidelidade.acumular(-10)).toThrow();
  });
});
