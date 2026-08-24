import { CriarUsuarioUseCase } from '../../../application/use-cases/usuarios/CriarUsuarioUseCase';
import { InMemoryUsuarioRepository } from '../../../infrastructure/database/repositories/InMemoryUsuarioRepository';
import { Role } from '../../../domain/enums/Role';
import { ConflictError, PermissaoNegadaError } from '../../../domain/errors/DomainErrors';
import { ILogger } from '../../../application/ports/ILogger';

class FakeLogger implements ILogger {
  info(_msg: string, _ctx?: Record<string, unknown>): void {}
  warn(_msg: string, _ctx?: Record<string, unknown>): void {}
  error(_msg: string, _ctx?: Record<string, unknown>): void {}
  debug(_msg: string, _ctx?: Record<string, unknown>): void {}
  auditoria(_acao: string, _ctx: Record<string, unknown>): void {}
}

describe('CriarUsuarioUseCase', () => {
  let repository: InMemoryUsuarioRepository;
  let useCase: CriarUsuarioUseCase;

  beforeEach(() => {
    repository = new InMemoryUsuarioRepository();
    useCase = new CriarUsuarioUseCase(repository, new FakeLogger());
  });

  test('ADMIN pode criar usuário com qualquer role', async () => {
    const result = await useCase.execute({
      nome: 'Maria',
      email: 'maria@teste.com',
      senha: 'Senha@123',
      role: Role.GERENTE,
      roleRequisitante: Role.ADMIN,
    });

    expect(result.email).toBe('maria@teste.com');
    expect(result.role).toBe(Role.GERENTE);
  });

  test('CLIENTE não pode criar usuário com role GERENTE', async () => {
    await expect(
      useCase.execute({
        nome: 'Pedro',
        email: 'pedro@teste.com',
        senha: 'Senha@123',
        role: Role.GERENTE,
        roleRequisitante: Role.CLIENTE,
      }),
    ).rejects.toThrow(PermissaoNegadaError);
  });

  test('e-mail duplicado lança ConflictError', async () => {
    await useCase.execute({
      nome: 'Ana',
      email: 'ana@teste.com',
      senha: 'Senha@123',
      role: Role.CLIENTE,
      roleRequisitante: Role.ADMIN,
    });

    await expect(
      useCase.execute({
        nome: 'Ana 2',
        email: 'ana@teste.com',
        senha: 'Senha@123',
        role: Role.CLIENTE,
        roleRequisitante: Role.ADMIN,
      }),
    ).rejects.toThrow(ConflictError);
  });

  test('senha é armazenada com hash bcrypt (não em texto plano)', async () => {
    await useCase.execute({
      nome: 'Carlos',
      email: 'carlos@teste.com',
      senha: 'Senha@123',
      role: Role.CLIENTE,
      roleRequisitante: Role.ADMIN,
    });

    const usuario = await repository.buscarPorEmail('carlos@teste.com');
    expect(usuario?.senhaHash).not.toBe('Senha@123');
    expect(usuario?.senhaHash).toMatch(/^\$2[aby]\$\d+\$/);
  });
});
