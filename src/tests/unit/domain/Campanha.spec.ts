import { Campanha } from '../../../domain/entities/Campanha';
import { TipoCampanha } from '../../../domain/enums/TipoCampanha';

const criarCampanha = (tipo: TipoCampanha, valor: number, ativa = true) =>
  new Campanha({
    id: 'camp-1',
    nome: 'Promo Teste',
    tipo,
    valor,
    unidadeId: null,
    dataInicio: new Date(Date.now() - 86400000),
    dataFim: new Date(Date.now() + 86400000),
    ativa,
    produtoIds: ['prod-1', 'prod-2'],
  });

describe('Campanha — entidade de domínio', () => {
  test('estaAtiva retorna true para campanha vigente e ativa', () => {
    const campanha = criarCampanha(TipoCampanha.PERCENTUAL, 10);
    expect(campanha.estaAtiva()).toBe(true);
  });

  test('estaAtiva retorna false para campanha com ativa=false', () => {
    const campanha = criarCampanha(TipoCampanha.PERCENTUAL, 10, false);
    expect(campanha.estaAtiva()).toBe(false);
  });

  test('estaAtiva retorna false para campanha fora do período', () => {
    const campanha = new Campanha({
      id: 'camp-2',
      nome: 'Expirada',
      tipo: TipoCampanha.PERCENTUAL,
      valor: 10,
      unidadeId: null,
      dataInicio: new Date('2020-01-01'),
      dataFim: new Date('2020-12-31'),
      ativa: true,
      produtoIds: ['prod-1'],
    });
    expect(campanha.estaAtiva()).toBe(false);
  });

  test('calcularDesconto PERCENTUAL — 10% de R$ 50 = R$ 5', () => {
    const campanha = criarCampanha(TipoCampanha.PERCENTUAL, 10);
    expect(campanha.calcularDesconto(50)).toBeCloseTo(5.0);
  });

  test('calcularDesconto VALOR_FIXO — R$ 5 fixo em produto de R$ 50', () => {
    const campanha = criarCampanha(TipoCampanha.VALOR_FIXO, 5);
    expect(campanha.calcularDesconto(50)).toBe(5);
  });

  test('calcularDesconto VALOR_FIXO não ultrapassa o preço base', () => {
    const campanha = criarCampanha(TipoCampanha.VALOR_FIXO, 100);
    expect(campanha.calcularDesconto(30)).toBe(30);
  });

  test('aplicaAoProduto retorna true para produto na lista', () => {
    const campanha = criarCampanha(TipoCampanha.PERCENTUAL, 10);
    expect(campanha.aplicaAoProduto('prod-1')).toBe(true);
  });

  test('aplicaAoProduto retorna false para produto fora da lista', () => {
    const campanha = criarCampanha(TipoCampanha.PERCENTUAL, 10);
    expect(campanha.aplicaAoProduto('prod-99')).toBe(false);
  });
});
