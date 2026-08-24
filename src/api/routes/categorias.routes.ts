import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, rbacMiddleware } from '../middlewares/authMiddleware';
import { validarBody } from '../middlewares/errorHandler';
import { CriarCategoriaSchema } from '../dto/schemas';
import { Role } from '../../domain/enums/Role';
import { RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';
import type { ICategoriaRepository } from '../../domain/repositories/ICategoriaRepository';
import type { ITokenService } from '../../application/ports/ITokenService';
import type { ILogger } from '../../application/ports/ILogger';

export function categoriasRouter(deps: {
  categoriaRepository: ICategoriaRepository;
  tokenService: ITokenService;
  logger: ILogger;
}): Router {
  const router = Router();
  const auth = authMiddleware(deps.tokenService);
  const gerenteOuAdmin = rbacMiddleware(Role.GERENTE, Role.ADMIN);

  /**
   * @openapi
   * /categorias:
   *   post:
   *     tags: [Cardápio]
   *     summary: Criar categoria de produto (GERENTE ou ADMIN)
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome]
   *             properties:
   *               nome: { type: string, example: "Tapiocas" }
   *               descricao: { type: string }
   *           example:
   *             nome: "Tapiocas"
   *             descricao: "Tapiocas artesanais do nordeste"
   *     responses:
   *       201:
   *         description: Categoria criada
   *         content:
   *           application/json:
   *             example:
   *               id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   *               nome: "Tapiocas"
   *               descricao: "Tapiocas artesanais do nordeste"
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
    validarBody(CriarCategoriaSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const categoria = await deps.categoriaRepository.criar(
          uuidv4(),
          req.body.nome as string,
          req.body.descricao as string | undefined,
        );
        res.status(201).json(categoria);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /categorias:
   *   get:
   *     tags: [Cardápio]
   *     summary: Listar todas as categorias
   *     responses:
   *       200:
   *         description: Lista de categorias
   *         content:
   *           application/json:
   *             example:
   *               data: [{ id: "uuid", nome: "Tapiocas", descricao: "..." }]
   */
  router.get(
    '/',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const categorias = await deps.categoriaRepository.listar();
        res.json({ data: categorias });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /categorias/{id}:
   *   get:
   *     tags: [Cardápio]
   *     summary: Detalhes de uma categoria
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Dados da categoria }
   *       404: { description: Categoria não encontrada }
   */
  router.get(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const categoria = await deps.categoriaRepository.buscarPorId(req.params['id'] as string);
        if (!categoria) throw new RecursoNaoEncontradoError('Categoria', req.params['id'] as string);
        res.json(categoria);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
