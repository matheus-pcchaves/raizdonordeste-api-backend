import { LoginUseCase } from '../../../application/use-cases/auth/LoginUseCase';
import { InMemoryUsuarioRepository } from '../../../infrastructure/database/repositories/InMemoryUsuarioRepository';
import { ITokenService, JwtPayload } from '../../../application/ports/ITokenService';
import { ILogger } from '../../../application/ports/ILogger';
import { Role } from '../../../domain/enums/Role';
import bcrypt from 'bcryptjs';

class FakeTokenService implements ITokenService {
  gerarAccessToken(_p: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return 'fake-access-token';
  }
  gerarRefreshToken(_p: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return 'fake-refresh-token';
  }
  verificarAccessToken(_token: string): JwtPayload {
    return { sub: 'u-1', email: 'test@test.com', role: Role.CLIENTE, type: 'access' };
  }
  verificarRefreshToken(_token: string): JwtPayload {
    return { sub: 'u-1', email: 'test@test.com', role: Role.CLIENTE, type: 'refresh' };
  }
}

class FakeLogger implements ILogger {
  info(_msg: string, _ctx?: Record<string, unknown>): void {}
  warn(_msg: string, _ctx?: Record<string, unknown>): void {}
  error(_msg: string, _ctx?: Record<string, unknown>): void {}
  debug(_msg: string, _ctx?: Record<string, unknown>): void {}
  auditoria(_acao: string, _ctx: Record<string, unknown>): void {}
}

describe('LoginUseCase', () => {
  let usuarioRepository: InMemoryUsuarioRepository;
  let useCase: LoginUseCase;

  beforeEach(async () => {
    usuarioRepository = new InMemoryUsuarioRepository();
    useCase = new LoginUseCase(usuarioRepository, new FakeTokenService(), new FakeLogger());

    const senhaHash = await bcrypt.hash('Senha@123', 10);
    await usuarioRepository.criar({
      id: 'u-1',
      nome: 'João Silva',
      email: 'joao@teste.com',
      senhaHash,
      role: Role.CLIENTE,
    });
  });

  test('login com credenciais válidas retorna tokens e dados do usuário', async () => {
    const result = await useCase.execute({ email: 'joao@teste.com', senha: 'Senha@123' });

    expect(result.accessToken).toBe('fake-access-token');
    expect(result.refreshToken).toBe('fake-refresh-token');
    expect(result.usuario.email).toBe('joao@teste.com');
    expect(result.usuario.role).toBe(Role.CLIENTE);
  });

  test('login com e-mail inexistente lança DomainError CREDENCIAIS_INVALIDAS', async () => {
    await expect(
      useCase.execute({ email: 'naoexiste@teste.com', senha: 'Senha@123' }),
    ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS' });
  });

  test('login com senha errada lança DomainError CREDENCIAIS_INVALIDAS', async () => {
    await expect(
      useCase.execute({ email: 'joao@teste.com', senha: 'SenhaErrada' }),
    ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS' });
  });
});
