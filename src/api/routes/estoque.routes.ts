import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, rbacMiddleware } from '../middlewares/authMiddleware';
import { validarBody, validarQuery } from '../middlewares/errorHandler';
import { EntradaEstoqueSchema, AjusteEstoqueSchema, PaginacaoSchema } from '../dto/schemas';
import { Role } from '../../domain/enums/Role';
import { TipoMovimentacaoEstoque } from '../../domain/enums/TipoMovimentacaoEstoque';
import { RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';
import { v4 as uuidv4 } from 'uuid';
import type { IEstoqueRepository } from '../../domain/repositories/IEstoqueRepository';
import type { ITokenService } from '../../application/ports/ITokenService';
import type { ILogger } from '../../application/ports/ILogger';

export function estoqueRouter(deps: {
  estoqueRepository: IEstoqueRepository;
  tokenService: ITokenService;
  logger: ILogger;
}): Router {
  const router = Router();
  const auth = authMiddleware(deps.tokenService);
  const gerenteOuAdmin = rbacMiddleware(Role.GERENTE, Role.ADMIN);

  /**
   * @openapi
   * /estoque:
   *   get:
   *     tags: [Estoque]
   *     summary: Listar estoque por unidade
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: unidadeId
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200: { description: Lista paginada de estoques }
   */
  router.get(
    '/',
    auth,
    gerenteOuAdmin,
    validarQuery(PaginacaoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const unidadeId = req.query['unidadeId'] as string;
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 10);
        const result = await deps.estoqueRepository.listarPorUnidade(unidadeId, page, limit);
        res.json({ data: result.estoques, pagination: { page, limit, total: result.total } });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /estoque/entradas:
   *   post:
   *     tags: [Estoque]
   *     summary: Registrar entrada de estoque
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [unidadeId, produtoId, quantidade, motivo]
   *             properties:
   *               unidadeId: { type: string, format: uuid }
   *               produtoId: { type: string, format: uuid }
   *               quantidade: { type: number }
   *               unidadeMedida: { type: string, default: "UN" }
   *               motivo: { type: string }
   *     responses:
   *       201: { description: Entrada registrada }
   */
  router.post(
    '/entradas',
    auth,
    gerenteOuAdmin,
    validarBody(EntradaEstoqueSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { unidadeId, produtoId, quantidade, motivo, unidadeMedida } = req.body as {
          unidadeId: string;
          produtoId: string;
          quantidade: number;
          motivo: string;
          unidadeMedida: string;
        };

        let estoque = await deps.estoqueRepository.buscarPorUnidadeEProduto(unidadeId, produtoId);
        if (!estoque) {
          estoque = await deps.estoqueRepository.criarSeNaoExistir(
            unidadeId,
            produtoId,
            unidadeMedida ?? 'UN',
            0,
          );
        }

        const novaQtd = estoque.quantidade + quantidade;
        await deps.estoqueRepository.atualizar(estoque.id, novaQtd);

        const movimentacao = await deps.estoqueRepository.registrarMovimentacao({
          id: uuidv4(),
          estoqueId: estoque.id,
          usuarioId: req.usuario!.sub,
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          quantidade,
          motivo,
        });

        deps.logger.auditoria('ESTOQUE_ENTRADA', {
          usuarioId: req.usuario!.sub,
          entidade: 'Estoque',
          entidadeId: estoque.id,
          ip: req.ip,
          extras: { quantidade, produtoId, unidadeId },
        });

        res.status(201).json(movimentacao);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /estoque/{id}/movimentacoes:
   *   get:
   *     tags: [Estoque]
   *     summary: Histórico de movimentações de estoque
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Histórico de movimentações }
   */
  router.get(
    '/:id/movimentacoes',
    auth,
    gerenteOuAdmin,
    validarQuery(PaginacaoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 10);
        const result = await deps.estoqueRepository.listarMovimentacoes(
          req.params['id'] as string,
          page,
          limit,
        );
        res.json({
          data: result.movimentacoes,
          pagination: { page, limit, total: result.total },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
