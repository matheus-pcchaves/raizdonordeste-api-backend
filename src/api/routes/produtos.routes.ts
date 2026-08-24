import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, rbacMiddleware } from '../middlewares/authMiddleware';
import { validarBody, validarQuery } from '../middlewares/errorHandler';
import {
  CriarProdutoSchema,
  AtualizarItemCardapioSchema,
  AdicionarAoCardapioSchema,
  PaginacaoSchema,
} from '../dto/schemas';
import { Role } from '../../domain/enums/Role';
import { StatusProduto } from '../../domain/enums/StatusProduto';
import { RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';
import type { IProdutoRepository } from '../../domain/repositories/IProdutoRepository';
import type { ITokenService } from '../../application/ports/ITokenService';
import type { ILogger } from '../../application/ports/ILogger';
import type { ICache } from '../../application/ports/ICache';

export function produtosRouter(deps: {
  produtoRepository: IProdutoRepository;
  tokenService: ITokenService;
  logger: ILogger;
  cache: ICache;
}): Router {
  const router = Router();
  const auth = authMiddleware(deps.tokenService);
  const gerenteOuAdmin = rbacMiddleware(Role.GERENTE, Role.ADMIN);

  /**
   * @openapi
   * /produtos:
   *   post:
   *     tags: [Cardápio]
   *     summary: Criar novo produto
   *     description: GERENTE ou ADMIN podem criar produtos. O produto é associado a uma categoria.
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome, precoBase, categoriaId]
   *             properties:
   *               nome: { type: string, example: "Tapioca de Frango" }
   *               descricao: { type: string }
   *               precoBase: { type: number, example: 18.90 }
   *               imagemUrl: { type: string, format: uri }
   *               categoriaId: { type: string, format: uuid }
   *           example:
   *             nome: "Tapioca de Frango"
   *             descricao: "Tapioca recheada com frango desfiado e queijo coalho"
   *             precoBase: 18.90
   *             categoriaId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   *     responses:
   *       201:
   *         description: Produto criado
   *         content:
   *           application/json:
   *             example:
   *               id: "7fa85f64-5717-4562-b3fc-2c963f66afa9"
   *               nome: "Tapioca de Frango"
   *               precoBase: 18.90
   *               status: "DISPONIVEL"
   *               categoriaId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
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
    gerenteOuAdmin,
    validarBody(CriarProdutoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const produto = await deps.produtoRepository.criar({
          id: uuidv4(),
          nome: req.body.nome as string,
          descricao: req.body.descricao as string | undefined,
          precoBase: req.body.precoBase as number,
          imagemUrl: req.body.imagemUrl as string | undefined,
          status: StatusProduto.DISPONIVEL,
          categoriaId: req.body.categoriaId as string,
        });
        deps.logger.auditoria('PRODUTO_CRIADO', {
          usuarioId: req.usuario!.sub,
          entidade: 'Produto',
          entidadeId: produto.id,
          ip: req.ip,
        });
        res.status(201).json(produto);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /produtos:
   *   get:
   *     tags: [Cardápio]
   *     summary: Listar produtos
   *     parameters:
   *       - in: query
   *         name: categoriaId
   *         schema: { type: string, format: uuid }
   *         description: Filtrar por categoria
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: Lista paginada de produtos
   *         content:
   *           application/json:
   *             example:
   *               data: [{ id: "uuid", nome: "Tapioca de Frango", precoBase: 18.90, status: "DISPONIVEL" }]
   *               pagination: { page: 1, limit: 10, total: 1 }
   */
  router.get(
    '/',
    validarQuery(PaginacaoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 10);
        const categoriaId = req.query['categoriaId'] as string | undefined;
        const result = await deps.produtoRepository.listar(page, limit, categoriaId);
        res.json({ data: result.produtos, pagination: { page, limit, total: result.total } });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /produtos/{id}:
   *   get:
   *     tags: [Cardápio]
   *     summary: Detalhes de um produto
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Dados do produto }
   *       404: { description: Produto não encontrado }
   */
  router.get(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const produto = await deps.produtoRepository.buscarPorId(req.params['id'] as string);
        if (!produto) throw new RecursoNaoEncontradoError('Produto', req.params['id'] as string);
        res.json(produto);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /produtos/{id}:
   *   patch:
   *     tags: [Cardápio]
   *     summary: Atualizar produto (GERENTE ou ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nome: { type: string }
   *               descricao: { type: string }
   *               precoBase: { type: number }
   *               imagemUrl: { type: string }
   *               categoriaId: { type: string, format: uuid }
   *     responses:
   *       200: { description: Produto atualizado }
   *       403: { description: Sem permissão }
   *       404: { description: Produto não encontrado }
   */
  router.patch(
    '/:id',
    auth,
    gerenteOuAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const produto = await deps.produtoRepository.atualizar(
          req.params['id'] as string,
          req.body as Record<string, unknown>,
        );
        // Invalida cache de cardápio ao alterar produto
        deps.cache.del(`cardapio:*`);
        res.json(produto);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /produtos/{id}:
   *   delete:
   *     tags: [Cardápio]
   *     summary: Remover produto (ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204: { description: Produto removido }
   *       403: { description: Sem permissão }
   *       404: { description: Produto não encontrado }
   */
  router.delete(
    '/:id',
    auth,
    rbacMiddleware(Role.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = req.params['id'] as string;
        const produto = await deps.produtoRepository.buscarPorId(id);
        if (!produto) throw new RecursoNaoEncontradoError('Produto', id);
        await deps.produtoRepository.remover(id);
        deps.logger.auditoria('PRODUTO_REMOVIDO', {
          usuarioId: req.usuario!.sub,
          entidade: 'Produto',
          entidadeId: id,
          ip: req.ip,
        });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  // ─── Cardápio por Unidade ──────────────────────────────────────────────────

  /**
   * @openapi
   * /produtos/cardapio/{unidadeId}:
   *   post:
   *     tags: [Cardápio]
   *     summary: Adicionar produto ao cardápio de uma unidade (GERENTE ou ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: unidadeId
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [produtoId]
   *             properties:
   *               produtoId: { type: string, format: uuid }
   *               precoEspecifico: { type: number, description: "Preço específico para esta unidade (opcional)" }
   *           example:
   *             produtoId: "7fa85f64-5717-4562-b3fc-2c963f66afa9"
   *             precoEspecifico: 19.90
   *     responses:
   *       201: { description: Produto adicionado ao cardápio }
   *       403: { description: Sem permissão }
   *       404: { description: Produto não encontrado }
   */
  router.post(
    '/cardapio/:unidadeId',
    auth,
    gerenteOuAdmin,
    validarBody(AdicionarAoCardapioSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const unidadeId = req.params['unidadeId'] as string;
        const { produtoId, precoEspecifico } = req.body as { produtoId: string; precoEspecifico?: number };
        await deps.produtoRepository.adicionarAoCardapio(unidadeId, produtoId, precoEspecifico);
        deps.cache.del(`cardapio:${unidadeId}`);
        res.status(201).json({ message: 'Produto adicionado ao cardápio.' });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /produtos/cardapio/{unidadeId}/{produtoId}:
   *   patch:
   *     tags: [Cardápio]
   *     summary: Atualizar item do cardápio (preço específico ou disponibilidade)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: unidadeId
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: path
   *         name: produtoId
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               precoEspecifico: { type: number }
   *               ativo: { type: boolean }
   *     responses:
   *       204: { description: Item do cardápio atualizado }
   */
  router.patch(
    '/cardapio/:unidadeId/:produtoId',
    auth,
    gerenteOuAdmin,
    validarBody(AtualizarItemCardapioSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { unidadeId, produtoId } = req.params as { unidadeId: string; produtoId: string };
        await deps.produtoRepository.atualizarItemCardapio(unidadeId, produtoId, req.body as { precoEspecifico?: number; ativo?: boolean });
        deps.cache.del(`cardapio:${unidadeId}`);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /produtos/cardapio/{unidadeId}/{produtoId}:
   *   delete:
   *     tags: [Cardápio]
   *     summary: Remover produto do cardápio da unidade
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: unidadeId
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: path
   *         name: produtoId
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204: { description: Produto removido do cardápio }
   */
  router.delete(
    '/cardapio/:unidadeId/:produtoId',
    auth,
    gerenteOuAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { unidadeId, produtoId } = req.params as { unidadeId: string; produtoId: string };
        await deps.produtoRepository.removerDoCardapio(unidadeId, produtoId);
        deps.cache.del(`cardapio:${unidadeId}`);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
