import { AderirFidelidadeUseCase } from '../../../application/use-cases/fidelidade/AderirFidelidadeUseCase';
import { InMemoryFidelidadeRepository } from '../../../infrastructure/database/repositories/InMemoryFidelidadeRepository';
import { InMemoryUsuarioRepository } from '../../../infrastructure/database/repositories/InMemoryUsuarioRepository';
import { ILogger } from '../../../application/ports/ILogger';
import { Role } from '../../../domain/enums/Role';
import { ConflictError, RecursoNaoEncontradoError } from '../../../domain/errors/DomainErrors';

class FakeLogger implements ILogger {
  info(_msg: string, _ctx?: Record<string, unknown>): void {}
  warn(_msg: string, _ctx?: Record<string, unknown>): void {}
  error(_msg: string, _ctx?: Record<string, unknown>): void {}
  debug(_msg: string, _ctx?: Record<string, unknown>): void {}
  auditoria(_acao: string, _ctx: Record<string, unknown>): void {}
}

function criarUseCase() {
  const fidelidadeRepository = new InMemoryFidelidadeRepository();
  const usuarioRepository = new InMemoryUsuarioRepository();
  const logger = new FakeLogger();
  const useCase = new AderirFidelidadeUseCase(fidelidadeRepository, usuarioRepository, logger);
  return { useCase, fidelidadeRepository, usuarioRepository };
}

describe('AderirFidelidadeUseCase — adesão bem-sucedida', () => {
  test('cliente com consentimento=true realiza adesão e recebe saldo zero', async () => {
    const { useCase, usuarioRepository } = criarUseCase();
    await usuarioRepository.criar({
      id: 'cliente-1',
      nome: 'Maria Silva',
      email: 'maria@teste.com',
      senhaHash: '$2b$10$hash',
      role: Role.CLIENTE,
    });

    const resultado = await useCase.execute({
      clienteId: 'cliente-1',
      consentimento: true,
    });

    expect(resultado.pontosSaldo).toBe(0);
    expect(resultado.fidelidadeId).toBeDefined();
  });

  test('after opt-in, usuário tem fidelidadeOptIn = true', async () => {
    const { useCase, usuarioRepository } = criarUseCase();
    await usuarioRepository.criar({
      id: 'cliente-2',
      nome: 'Pedro Costa',
      email: 'pedro@teste.com',
      senhaHash: '$2b$10$hash',
      role: Role.CLIENTE,
    });

    await useCase.execute({ clienteId: 'cliente-2', consentimento: true });

    const usuario = await usuarioRepository.buscarPorId('cliente-2');
    expect(usuario?.fidelidadeOptIn).toBe(true);
  });
});

describe('AderirFidelidadeUseCase — LGPD: consentimento obrigatório', () => {
  test('lança ConflictError quando consentimento é false', async () => {
    const { useCase, usuarioRepository } = criarUseCase();
    await usuarioRepository.criar({
      id: 'cliente-3',
      nome: 'Ana Lima',
      email: 'ana@teste.com',
      senhaHash: '$2b$10$hash',
      role: Role.CLIENTE,
    });

    await expect(
      useCase.execute({ clienteId: 'cliente-3', consentimento: false }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('AderirFidelidadeUseCase — adesão duplicada', () => {
  test('lança ConflictError quando cliente já está inscrito no programa', async () => {
    const { useCase, usuarioRepository } = criarUseCase();
    await usuarioRepository.criar({
      id: 'cliente-4',
      nome: 'Carlos Souza',
      email: 'carlos@teste.com',
      senhaHash: '$2b$10$hash',
      role: Role.CLIENTE,
    });

    // Primeira adesão — deve funcionar
    await useCase.execute({ clienteId: 'cliente-4', consentimento: true });

    // Segunda adesão — deve falhar
    await expect(
      useCase.execute({ clienteId: 'cliente-4', consentimento: true }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('AderirFidelidadeUseCase — usuário inexistente', () => {
  test('lança RecursoNaoEncontradoError para clienteId que não existe', async () => {
    const { useCase } = criarUseCase();

    await expect(
      useCase.execute({ clienteId: 'nao-existe', consentimento: true }),
    ).rejects.toThrow(RecursoNaoEncontradoError);
  });
});
