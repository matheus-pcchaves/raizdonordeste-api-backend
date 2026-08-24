import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, rbacMiddleware } from '../middlewares/authMiddleware';
import { validarBody, validarQuery } from '../middlewares/errorHandler';
import { CriarCampanhaSchema, PaginacaoSchema } from '../dto/schemas';
import { Role } from '../../domain/enums/Role';
import { RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';
import type { ICampanhaRepository } from '../../domain/repositories/ICampanhaRepository';
import type { ITokenService } from '../../application/ports/ITokenService';
import type { ILogger } from '../../application/ports/ILogger';

export function campanhasRouter(deps: {
  campanhaRepository: ICampanhaRepository;
  tokenService: ITokenService;
  logger: ILogger;
}): Router {
  const router = Router();
  const auth = authMiddleware(deps.tokenService);

  /**
   * @openapi
   * /campanhas:
   *   post:
   *     tags: [Campanhas]
   *     summary: Criar campanha promocional
   *     description: >
   *       GERENTE cria campanhas para sua unidade (campo unidadeId obrigatório).
   *       ADMIN pode criar campanhas para toda a rede (unidadeId opcional — sem unidadeId aplica a todas).
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome, tipo, valor, dataInicio, dataFim, produtoIds]
   *             properties:
   *               nome: { type: string, example: "Promo Verão" }
   *               tipo:
   *                 type: string
   *                 enum: [PERCENTUAL, VALOR_FIXO]
   *               valor: { type: number, example: 10.0, description: "Percentual (ex: 10 = 10%) ou valor em R$" }
   *               unidadeId: { type: string, format: uuid, description: "Omitir para campanha de rede (ADMIN)" }
   *               dataInicio: { type: string, format: date-time }
   *               dataFim: { type: string, format: date-time }
   *               produtoIds:
   *                 type: array
   *                 items: { type: string, format: uuid }
   *           example:
   *             nome: "Promo Verão"
   *             tipo: "PERCENTUAL"
   *             valor: 10
   *             unidadeId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   *             dataInicio: "2026-08-01T00:00:00.000Z"
   *             dataFim: "2026-08-31T23:59:59.000Z"
   *             produtoIds: ["7fa85f64-5717-4562-b3fc-2c963f66afa9"]
   *     responses:
   *       201:
   *         description: Campanha criada
   *         content:
   *           application/json:
   *             example:
   *               id: "uuid"
   *               nome: "Promo Verão"
   *               tipo: "PERCENTUAL"
   *               valor: 10
   *               ativa: true
   *               dataInicio: "2026-08-01T00:00:00.000Z"
   *               dataFim: "2026-08-31T23:59:59.000Z"
   *       400: { description: dataFim antes de dataInicio }
   *       401: { description: Não autenticado }
   *       403: { description: Sem permissão }
   *       422:
   *         description: Dados inválidos
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErroResponse' }
   */
  router.post(
    '/',
    auth,
    rbacMiddleware(Role.GERENTE, Role.ADMIN),
    validarBody(CriarCampanhaSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const role = req.usuario!.role as Role;
        const body = req.body as {
          nome: string;
          tipo: string;
          valor: number;
          unidadeId?: string;
          dataInicio: string;
          dataFim: string;
          produtoIds: string[];
        };

        const campanha = await deps.campanhaRepository.criar({
          id: uuidv4(),
          nome: body.nome,
          tipo: body.tipo,
          valor: body.valor,
          unidadeId: role === Role.GERENTE ? (body.unidadeId ?? null) : (body.unidadeId ?? null),
          dataInicio: new Date(body.dataInicio),
          dataFim: new Date(body.dataFim),
          ativa: true,
          produtoIds: body.produtoIds,
        });

        deps.logger.auditoria('CAMPANHA_CRIADA', {
          usuarioId: req.usuario!.sub,
          entidade: 'Campanha',
          entidadeId: campanha.id,
          ip: req.ip,
          extras: { nome: campanha.nome, tipo: campanha.tipo },
        });

        res.status(201).json(campanha);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /campanhas:
   *   get:
   *     tags: [Campanhas]
   *     summary: Listar campanhas (paginado)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: Lista paginada de campanhas
   *         content:
   *           application/json:
   *             example:
   *               data: [{ id: "uuid", nome: "Promo Verão", tipo: "PERCENTUAL", valor: 10, ativa: true }]
   *               pagination: { page: 1, limit: 10, total: 1 }
   */
  router.get(
    '/',
    auth,
    rbacMiddleware(Role.GERENTE, Role.ADMIN),
    validarQuery(PaginacaoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 10);
        const result = await deps.campanhaRepository.listar(page, limit);
        res.json({ data: result.campanhas, pagination: { page, limit, total: result.total } });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /campanhas/ativas:
   *   get:
   *     tags: [Campanhas]
   *     summary: Listar campanhas ativas (vigentes agora)
   *     parameters:
   *       - in: query
   *         name: unidadeId
   *         schema: { type: string, format: uuid }
   *         description: Filtrar campanhas de uma unidade específica
   *     responses:
   *       200:
   *         description: Campanhas ativas
   *         content:
   *           application/json:
   *             example:
   *               data: [{ id: "uuid", nome: "Promo Verão", tipo: "PERCENTUAL", valor: 10 }]
   */
  router.get(
    '/ativas',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const unidadeId = req.query['unidadeId'] as string | undefined;
        const campanhas = await deps.campanhaRepository.listarAtivas(unidadeId);
        res.json({ data: campanhas });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /campanhas/{id}:
   *   get:
   *     tags: [Campanhas]
   *     summary: Detalhes de uma campanha
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Dados da campanha }
   *       404: { description: Campanha não encontrada }
   */
  router.get(
    '/:id',
    auth,
    rbacMiddleware(Role.GERENTE, Role.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const campanha = await deps.campanhaRepository.buscarPorId(req.params['id'] as string);
        if (!campanha) throw new RecursoNaoEncontradoError('Campanha', req.params['id'] as string);
        res.json(campanha);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /campanhas/{id}:
   *   patch:
   *     tags: [Campanhas]
   *     summary: Atualizar campanha (GERENTE ou ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nome: { type: string }
   *               ativa: { type: boolean }
   *               valor: { type: number }
   *               dataFim: { type: string, format: date-time }
   *     responses:
   *       200: { description: Campanha atualizada }
   *       404: { description: Campanha não encontrada }
   */
  router.patch(
    '/:id',
    auth,
    rbacMiddleware(Role.GERENTE, Role.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = req.params['id'] as string;
        const campanha = await deps.campanhaRepository.buscarPorId(id);
        if (!campanha) throw new RecursoNaoEncontradoError('Campanha', id);
        const atualizada = await deps.campanhaRepository.atualizar(id, req.body as Record<string, unknown>);
        res.json(atualizada);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /campanhas/{id}:
   *   delete:
   *     tags: [Campanhas]
   *     summary: Remover campanha (ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204: { description: Campanha removida }
   *       403: { description: Sem permissão }
   *       404: { description: Campanha não encontrada }
   */
  router.delete(
    '/:id',
    auth,
    rbacMiddleware(Role.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = req.params['id'] as string;
        const campanha = await deps.campanhaRepository.buscarPorId(id);
        if (!campanha) throw new RecursoNaoEncontradoError('Campanha', id);
        await deps.campanhaRepository.remover(id);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
