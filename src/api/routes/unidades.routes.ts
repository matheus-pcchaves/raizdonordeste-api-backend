import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, rbacMiddleware } from '../middlewares/authMiddleware';
import { validarBody, validarQuery } from '../middlewares/errorHandler';
import {
  CriarUnidadeSchema,
  AtualizarUnidadeSchema,
  PaginacaoSchema,
} from '../dto/schemas';
import { CriarUnidadeUseCase } from '../../application/use-cases/unidades/CriarUnidadeUseCase';
import { Role } from '../../domain/enums/Role';
import { RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';
import type { IUnidadeRepository } from '../../domain/repositories/IUnidadeRepository';
import type { ITokenService } from '../../application/ports/ITokenService';
import type { ILogger } from '../../application/ports/ILogger';
import type { ICache } from '../../application/ports/ICache';

export function unidadesRouter(deps: {
  unidadeRepository: IUnidadeRepository;
  tokenService: ITokenService;
  logger: ILogger;
  cache: ICache;
}): Router {
  const router = Router();
  const auth = authMiddleware(deps.tokenService);

  const criarUnidadeUC = new CriarUnidadeUseCase(deps.unidadeRepository, deps.logger);

  /**
   * @openapi
   * /unidades:
   *   post:
   *     tags: [Unidades]
   *     summary: Criar unidade (ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome, endereco, cnpj, telefone]
   *             properties:
   *               nome: { type: string }
   *               endereco: { type: string }
   *               cnpj: { type: string, example: "12345678000195" }
   *               telefone: { type: string }
   *     responses:
   *       201: { description: Unidade criada }
   *       409: { description: CNPJ já cadastrado }
   */
  router.post(
    '/',
    auth,
    rbacMiddleware(Role.ADMIN),
    validarBody(CriarUnidadeSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const unidade = await criarUnidadeUC.execute({
          nome: req.body.nome as string,
          endereco: req.body.endereco as string,
          cnpj: req.body.cnpj as string,
          telefone: req.body.telefone as string,
          adminId: req.usuario!.sub,
          ip: req.ip,
        });
        res.status(201).json(unidade);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /unidades:
   *   get:
   *     tags: [Unidades]
   *     summary: Listar unidades ativas
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200: { description: Lista paginada de unidades }
   */
  router.get(
    '/',
    validarQuery(PaginacaoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 10);
        const result = await deps.unidadeRepository.listar(page, limit, true);
        res.json({
          data: result.unidades,
          pagination: { page, limit, total: result.total },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /unidades/{id}:
   *   get:
   *     tags: [Unidades]
   *     summary: Detalhes de uma unidade
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Dados da unidade }
   *       404: { description: Unidade não encontrada }
   */
  router.get(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const unidade = await deps.unidadeRepository.buscarPorId(req.params['id'] as string);
        if (!unidade) throw new RecursoNaoEncontradoError('Unidade', req.params['id'] as string);
        res.json(unidade);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /unidades/{id}:
   *   patch:
   *     tags: [Unidades]
   *     summary: Atualizar unidade (ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Unidade atualizada }
   */
  router.patch(
    '/:id',
    auth,
    rbacMiddleware(Role.ADMIN),
    validarBody(AtualizarUnidadeSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const unidade = await deps.unidadeRepository.atualizar(
          req.params['id'] as string,
          req.body as Record<string, unknown>,
        );
        res.json(unidade);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /unidades/{id}:
   *   delete:
   *     tags: [Unidades]
   *     summary: Inativar unidade (ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204: { description: Unidade inativada }
   */
  router.delete(
    '/:id',
    auth,
    rbacMiddleware(Role.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await deps.unidadeRepository.inativar(req.params['id'] as string);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /unidades/{id}/cardapio:
   *   get:
   *     tags: [Cardápio]
   *     summary: Consultar cardápio da unidade (com cache)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: categoriaId
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: apenasDisponiveis
   *         schema: { type: boolean }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Cardápio da unidade }
   */
  // Nota: cardápio é servido via unidadesRouter — será injetada implementação de IProdutoRepository
  router.get(
    '/:id/cardapio',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const unidadeId = req.params['id'] as string;
        const cacheKey = `cardapio:${unidadeId}`;

        const cached = deps.cache.get<unknown>(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          res.json(cached);
          return;
        }

        // A implementação real virá do ProdutoRepository injetado no app.ts
        // Aqui retornamos um placeholder para que a rota exista
        const result = { data: [], pagination: { page: 1, limit: 20, total: 0 } };
        deps.cache.set(cacheKey, result, Number(process.env['CACHE_TTL_CARDAPIO_SECONDS'] ?? 120));

        res.setHeader('X-Cache', 'MISS');
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
