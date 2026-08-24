import { Estoque } from '../../../domain/entities/Estoque';
import { EstoqueInsuficienteError } from '../../../domain/errors/DomainErrors';

describe('Estoque — entidade de domínio', () => {
  const criarEstoque = (quantidade = 10) =>
    new Estoque({
      id: 'est-1',
      unidadeId: 'unidade-1',
      produtoId: 'produto-1',
      quantidade,
      unidadeMedida: 'UN',
      quantidadeMinima: 2,
      atualizadoEm: new Date(),
    });

  test('verificarDisponibilidade retorna true quando há estoque suficiente', () => {
    const estoque = criarEstoque(10);
    expect(estoque.verificarDisponibilidade(5)).toBe(true);
  });

  test('verificarDisponibilidade retorna false quando estoque é insuficiente', () => {
    const estoque = criarEstoque(3);
    expect(estoque.verificarDisponibilidade(5)).toBe(false);
  });

  test('reservar deduz a quantidade corretamente', () => {
    const estoque = criarEstoque(10);
    estoque.reservar(3, 'Produto X');
    expect(estoque.quantidade).toBe(7);
  });

  test('reservar lança EstoqueInsuficienteError quando não há estoque', () => {
    const estoque = criarEstoque(2);
    expect(() => estoque.reservar(5, 'Produto X')).toThrow(EstoqueInsuficienteError);
  });

  test('estornar devolve a quantidade ao estoque', () => {
    const estoque = criarEstoque(5);
    estoque.estornar(3);
    expect(estoque.quantidade).toBe(8);
  });

  test('entrada aumenta o estoque corretamente', () => {
    const estoque = criarEstoque(5);
    estoque.entrada(10);
    expect(estoque.quantidade).toBe(15);
  });

  test('entrada lança erro para quantidade zero ou negativa', () => {
    const estoque = criarEstoque(5);
    expect(() => estoque.entrada(0)).toThrow();
    expect(() => estoque.entrada(-3)).toThrow();
  });

  test('atingiuMinimo retorna true quando quantidade <= quantidadeMinima', () => {
    const estoque = criarEstoque(2);
    expect(estoque.atingiuMinimo()).toBe(true);
  });

  test('atingiuMinimo retorna false quando há estoque acima do mínimo', () => {
    const estoque = criarEstoque(10);
    expect(estoque.atingiuMinimo()).toBe(false);
  });
});
