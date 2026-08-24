import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { CriarUsuarioUseCase } from '../../application/use-cases/usuarios/CriarUsuarioUseCase';
import { LoginSchema, RefreshTokenSchema } from '../dto/schemas';
import { validarBody } from '../middlewares/errorHandler';
import { authMiddleware } from '../middlewares/authMiddleware';
import { ITokenService } from '../../application/ports/ITokenService';
import { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository';
import { ILogger } from '../../application/ports/ILogger';
import { Role } from '../../domain/enums/Role';
import { z } from 'zod';

const authLimiter = rateLimit({
  windowMs: Number(process.env['AUTH_RATE_LIMIT_WINDOW_MS'] ?? 60000),
  max: Number(process.env['AUTH_RATE_LIMIT_MAX'] ?? 10),
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Muitas tentativas de login. Tente novamente em 1 minuto.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export function authRouter(deps: {
  usuarioRepository: IUsuarioRepository;
  tokenService: ITokenService;
  logger: ILogger;
}): Router {
  const router = Router();

  const loginUseCase = new LoginUseCase(deps.usuarioRepository, deps.tokenService, deps.logger);
  const refreshUseCase = new RefreshTokenUseCase(deps.tokenService, deps.usuarioRepository);
  const criarUsuarioUC = new CriarUsuarioUseCase(deps.usuarioRepository, deps.logger);

  // Schema de validação para auto-registro (role fixo = CLIENTE)
  const RegistrarClienteSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  });

  /**
   * @openapi
   * /auth/registrar:
   *   post:
   *     tags: [Auth]
   *     summary: Auto-registro de cliente (público)
   *     description: >
   *       Endpoint **público** para clientes criarem sua própria conta sem precisar de token.
   *       O role é sempre fixado em `CLIENTE`. Para criar usuários com outros roles
   *       (ATENDENTE, COZINHA, GERENTE, ADMIN), use `POST /usuarios` com token ADMIN/GERENTE.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome, email, senha]
   *             properties:
   *               nome:
   *                 type: string
   *                 example: "João Silva"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "joao.silva@yahoo.com"
   *               senha:
   *                 type: string
   *                 minLength: 8
   *                 example: "Senha@123"
   *     responses:
   *       201:
   *         description: Cliente registrado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id: { type: string, format: uuid }
   *                 nome: { type: string }
   *                 email: { type: string }
   *                 role: { type: string, example: "CLIENTE" }
   *       409:
   *         description: E-mail já cadastrado
   *       422:
   *         description: Dados inválidos
   */
  router.post(
    '/registrar',
    validarBody(RegistrarClienteSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await criarUsuarioUC.execute({
          nome: req.body.nome as string,
          email: req.body.email as string,
          senha: req.body.senha as string,
          role: Role.CLIENTE,          // sempre CLIENTE no auto-registro
          roleRequisitante: Role.CLIENTE, // sem token necessário
          ip: req.ip,
        });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },
  );


  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login com e-mail e senha
   *     description: Autentica o usuário e retorna um par de tokens JWT (access + refresh).
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, senha]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: joao@exemplo.com
   *               senha:
   *                 type: string
   *                 example: "Senha@123"
   *     responses:
   *       200:
   *         description: Login realizado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 accessToken:
   *                   type: string
   *                 refreshToken:
   *                   type: string
   *                 usuario:
   *                   type: object
   *                   properties:
   *                     id: { type: string, format: uuid }
   *                     nome: { type: string }
   *                     email: { type: string }
   *                     role: { $ref: '#/components/schemas/Role' }
   *       401:
   *         description: Credenciais inválidas
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErroResponse'
   *       429:
   *         description: Rate limit excedido
   */
  router.post(
    '/login',
    authLimiter,
    validarBody(LoginSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const resultado = await loginUseCase.execute({
          email: req.body.email as string,
          senha: req.body.senha as string,
          ip: req.ip,
        });
        res.status(200).json(resultado);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Renovar token de acesso
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Novo par de tokens
   *       401:
   *         description: Refresh token inválido
   */
  router.post(
    '/refresh',
    validarBody(RefreshTokenSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const resultado = await refreshUseCase.execute(req.body.refreshToken as string);
        res.status(200).json(resultado);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout (invalidar sessão)
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       204:
   *         description: Logout realizado com sucesso
   *       401:
   *         description: Não autenticado
   */
  router.post(
    '/logout',
    authMiddleware(deps.tokenService),
    (_req: Request, res: Response) => {
      // Com JWT stateless, o logout é feito no cliente descartando o token.
      // Para invalidação server-side, implementar uma blocklist (ex.: Redis).
      res.status(204).send();
    },
  );

  return router;
}
