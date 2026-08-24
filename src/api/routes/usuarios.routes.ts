import { Router, Request, Response, NextFunction } from 'express';
import { CriarUsuarioUseCase } from '../../application/use-cases/usuarios/CriarUsuarioUseCase';
import { AnonimizarUsuarioUseCase } from '../../application/use-cases/usuarios/AnonimizarUsuarioUseCase';
import { CriarUsuarioSchema } from '../dto/schemas';
import { validarBody } from '../middlewares/errorHandler';
import { authMiddleware, rbacMiddleware } from '../middlewares/authMiddleware';
import { Role } from '../../domain/enums/Role';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository';
import type { ITokenService } from '../../application/ports/ITokenService';
import type { ILogger } from '../../application/ports/ILogger';
import { RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';

export function usuariosRouter(deps: {
  usuarioRepository: IUsuarioRepository;
  tokenService: ITokenService;
  logger: ILogger;
}): Router {
  const router = Router();
  const auth = authMiddleware(deps.tokenService);

  const criarUsuarioUC = new CriarUsuarioUseCase(deps.usuarioRepository, deps.logger);
  const anonimizarUC = new AnonimizarUsuarioUseCase(deps.usuarioRepository, deps.logger);

  /**
   * @openapi
   * /usuarios:
   *   post:
   *     tags: [Usuários]
   *     summary: Criar novo usuário
   *     description: >
   *       GERENTE pode criar ATENDENTE e COZINHA. ADMIN pode criar qualquer role.
   *       CLIENTE pode se auto-registrar.
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome, email, senha, role]
   *             properties:
   *               nome: { type: string, example: "João Silva" }
   *               email: { type: string, format: email }
   *               senha: { type: string, example: "Senha@123" }
   *               role: { $ref: '#/components/schemas/Role' }
   *     responses:
   *       201: { description: Usuário criado com sucesso }
   *       409: { description: E-mail já cadastrado }
   *       422: { description: Dados inválidos }
   */
  router.post(
    '/',
    auth,
    validarBody(CriarUsuarioSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await criarUsuarioUC.execute({
          nome: req.body.nome as string,
          email: req.body.email as string,
          senha: req.body.senha as string,
          role: req.body.role as Role,
          roleRequisitante: req.usuario!.role as Role,
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
   * /usuarios/me:
   *   get:
   *     tags: [Usuários]
   *     summary: Perfil do usuário autenticado
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200: { description: Dados do perfil }
   *       401: { description: Não autenticado }
   */
  router.get(
    '/me',
    auth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const usuario = await deps.usuarioRepository.buscarPorId(req.usuario!.sub);
        if (!usuario) {
          throw new RecursoNaoEncontradoError('Usuario', req.usuario!.sub);
        }
        res.json({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          fidelidadeOptIn: usuario.fidelidadeOptIn,
          ultimoLogin: usuario.ultimoLogin,
          criadoEm: usuario.criadoEm,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /usuarios:
   *   get:
   *     tags: [Usuários]
   *     summary: Listar todos os usuários (ADMIN)
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200: { description: Lista paginada de usuários }
   *       403: { description: Acesso negado }
   */
  router.get(
    '/',
    auth,
    rbacMiddleware(Role.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 10);
        const result = await deps.usuarioRepository.listar(page, limit);
        res.json({
          data: result.usuarios.map((u) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            role: u.role,
            criadoEm: u.criadoEm,
          })),
          pagination: { page, limit, total: result.total },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /usuarios/{id}:
   *   delete:
   *     tags: [Usuários]
   *     summary: Anonimizar usuário (LGPD — direito ao esquecimento)
   *     description: Remove dados pessoais do usuário conforme Art. 18 da LGPD.
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204: { description: Usuário anonimizado }
   *       404: { description: Usuário não encontrado }
   */
  router.delete(
    '/:id',
    auth,
    rbacMiddleware(Role.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await anonimizarUC.execute({
          usuarioId: req.params['id'] as string,
          requisitanteId: req.usuario!.sub,
          ip: req.ip,
        });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
