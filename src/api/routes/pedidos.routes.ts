import { Router, Request, Response, NextFunction } from 'express';
import { CriarPedidoSchema, TransitarStatusSchema, FiltrosPedidoSchema } from '../dto/schemas';
import { validarBody, validarQuery } from '../middlewares/errorHandler';
import { authMiddleware, rbacMiddleware, authOpcionalMiddleware } from '../middlewares/authMiddleware';
import { CriarPedidoUseCase } from '../../application/use-cases/pedidos/CriarPedidoUseCase';
import { TransitarStatusPedidoUseCase } from '../../application/use-cases/pedidos/TransitarStatusPedidoUseCase';
import { Role } from '../../domain/enums/Role';
import { CanalPedido } from '../../domain/enums/CanalPedido';
import { StatusPedido } from '../../domain/enums/StatusPedido';
import { PermissaoNegadaError, RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';
import type { IPedidoRepository } from '../../domain/repositories/IPedidoRepository';
import type { IEstoqueRepository } from '../../domain/repositories/IEstoqueRepository';
import type { IPagamentoRepository } from '../../domain/repositories/IPagamentoRepository';
import type { IUnidadeRepository } from '../../domain/repositories/IUnidadeRepository';
import type { IGatewayPagamento } from '../../application/ports/IGatewayPagamento';
import type { ILogger } from '../../application/ports/ILogger';
import type { ITokenService } from '../../application/ports/ITokenService';
import { PromocaoService } from '../../application/services/PromocaoService';
import { FidelidadeService } from '../../application/services/FidelidadeService';

interface PedidosDeps {
  pedidoRepository: IPedidoRepository;
  estoqueRepository: IEstoqueRepository;
  pagamentoRepository: IPagamentoRepository;
  unidadeRepository: IUnidadeRepository;
  gatewayPagamento: IGatewayPagamento;
  promocaoService: PromocaoService;
  fidelidadeService: FidelidadeService;
  tokenService: ITokenService;
  logger: ILogger;
}

export function pedidosRouter(deps: PedidosDeps): Router {
  const router = Router();

  const criarPedidoUC = new CriarPedidoUseCase(
    deps.pedidoRepository,
    deps.estoqueRepository,
    deps.pagamentoRepository,
    deps.unidadeRepository,
    deps.gatewayPagamento,
    deps.promocaoService,
    deps.fidelidadeService,
    deps.logger,
  );

  const transitarStatusUC = new TransitarStatusPedidoUseCase(
    deps.pedidoRepository,
    deps.estoqueRepository,
    deps.logger,
  );

  /**
   * @openapi
   * /pedidos:
   *   post:
   *     tags: [Pedidos]
   *     summary: Criar novo pedido
   *     description: >
   *       Cria um pedido com itens, canal de origem e forma de pagamento.
   *       O campo **canalPedido** é obrigatório.
   *       Pedidos via TOTEM podem ser anônimos (sem token JWT).
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [canalPedido, unidadeId, itens, formaPagamento]
   *             properties:
   *               canalPedido:
   *                 $ref: '#/components/schemas/CanalPedido'
   *               unidadeId:
   *                 type: string
   *                 format: uuid
   *               itens:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [produtoId, quantidade]
   *                   properties:
   *                     produtoId: { type: string, format: uuid }
   *                     quantidade: { type: integer, minimum: 1 }
   *               formaPagamento:
   *                 type: string
   *                 example: MOCK
   *               pontosParaResgatar:
   *                 type: integer
   *                 minimum: 0
   *                 default: 0
   *           example:
   *             canalPedido: TOTEM
   *             unidadeId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   *             itens:
   *               - produtoId: "7fa85f64-5717-4562-b3fc-2c963f66afa9"
   *                 quantidade: 2
   *             formaPagamento: MOCK
   *     responses:
   *       201:
   *         description: Pedido criado e pagamento aprovado
   *       202:
   *         description: Pagamento pendente (timeout do gateway)
   *       400:
   *         description: canalPedido não informado ou inválido
   *       402:
   *         description: Pagamento negado
   *       422:
   *         description: Estoque insuficiente ou produto indisponível
   */
  router.post(
    '/',
    authOpcionalMiddleware(deps.tokenService),
    validarBody(CriarPedidoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await criarPedidoUC.execute({
          clienteId: req.usuario?.sub ?? null,
          unidadeId: req.body.unidadeId as string,
          canalPedido: req.body.canalPedido as CanalPedido,
          itens: req.body.itens as Array<{ produtoId: string; quantidade: number }>,
          formaPagamento: req.body.formaPagamento as string,
          pontosParaResgatar: req.body.pontosParaResgatar as number | undefined,
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
   * /pedidos:
   *   get:
   *     tags: [Pedidos]
   *     summary: Listar pedidos com filtros
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: canalPedido
   *         schema: { $ref: '#/components/schemas/CanalPedido' }
   *       - in: query
   *         name: status
   *         schema: { $ref: '#/components/schemas/StatusPedido' }
   *       - in: query
   *         name: unidadeId
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200: { description: Lista paginada de pedidos }
   */
  router.get(
    '/',
    authMiddleware(deps.tokenService),
    rbacMiddleware(Role.ATENDENTE, Role.GERENTE, Role.ADMIN),
    validarQuery(FiltrosPedidoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const q = req.query as Record<string, string>;
        const result = await deps.pedidoRepository.listar({
          canalPedido: q['canalPedido'] as CanalPedido | undefined,
          status: q['status'] as StatusPedido | undefined,
          unidadeId: q['unidadeId'],
          page: Number(q['page'] ?? 1),
          limit: Number(q['limit'] ?? 10),
        });
        res.json({
          data: result.pedidos,
          pagination: {
            page: Number(q['page'] ?? 1),
            limit: Number(q['limit'] ?? 10),
            total: result.total,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /pedidos/{id}:
   *   get:
   *     tags: [Pedidos]
   *     summary: Detalhes de um pedido
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Detalhes do pedido com itens }
   *       404: { description: Pedido não encontrado }
   */
  router.get(
    '/:id',
    authMiddleware(deps.tokenService),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const pedido = await deps.pedidoRepository.buscarPorIdComItens(req.params['id'] as string);
        if (!pedido) throw new RecursoNaoEncontradoError('Pedido', req.params['id'] as string);

        // Cliente só vê seus próprios pedidos
        const usuario = req.usuario!;
        if (
          usuario.role === Role.CLIENTE &&
          pedido.clienteId !== usuario.sub
        ) {
          throw new PermissaoNegadaError('visualizar pedido de outro cliente');
        }

        res.json(pedido);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /pedidos/{id}/status:
   *   patch:
   *     tags: [Pedidos]
   *     summary: Atualizar status do pedido
   *     description: >
   *       Respeita a máquina de estados e as permissões por role:
   *       COZINHA → pode mover para PRONTO;
   *       ATENDENTE/GERENTE → pode mover para ENTREGUE ou CANCELADO.
   *     security:
   *       - BearerAuth: []
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
   *             required: [novoStatus]
   *             properties:
   *               novoStatus: { $ref: '#/components/schemas/StatusPedido' }
   *               motivo: { type: string }
   *     responses:
   *       204: { description: Status atualizado }
   *       403: { description: Permissão negada para esta transição }
   *       422: { description: Transição de status inválida }
   */
  router.patch(
    '/:id/status',
    authMiddleware(deps.tokenService),
    rbacMiddleware(Role.ATENDENTE, Role.COZINHA, Role.GERENTE, Role.ADMIN),
    validarBody(TransitarStatusSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await transitarStatusUC.execute({
          pedidoId: req.params['id'] as string,
          novoStatus: req.body.novoStatus as StatusPedido,
          roleRequisitante: req.usuario!.role as Role,
          usuarioId: req.usuario!.sub,
          motivo: req.body.motivo as string | undefined,
          ip: req.ip,
        });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /pedidos/{id}:
   *   delete:
   *     tags: [Pedidos]
   *     summary: Cancelar pedido
   *     description: >
   *       CLIENTE pode cancelar apenas seus próprios pedidos em status PENDENTE ou AGUARDANDO_PAGAMENTO.
   *       ATENDENTE/GERENTE podem cancelar qualquer pedido.
   *     security:
   *       - BearerAuth: []
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
   *               motivo: { type: string }
   *     responses:
   *       204: { description: Pedido cancelado }
   *       403: { description: Sem permissão }
   *       422: { description: Cancelamento não permitido neste status }
   */
  router.delete(
    '/:id',
    authMiddleware(deps.tokenService),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const pedido = await deps.pedidoRepository.buscarPorIdComItens(req.params['id'] as string);
        if (!pedido) throw new RecursoNaoEncontradoError('Pedido', req.params['id'] as string);

        const usuario = req.usuario!;
        const role = usuario.role as Role;

        // RF-04.9 — cliente cancela só os próprios pedidos e só em status permitido
        if (role === Role.CLIENTE) {
          if (pedido.clienteId !== usuario.sub) {
            throw new PermissaoNegadaError('cancelar pedido de outro cliente');
          }
          if (!pedido.podeCancelarComoCliente()) {
            throw new PermissaoNegadaError(
              `cancelar pedido em status ${pedido.status}`,
            );
          }
        }

        await transitarStatusUC.execute({
          pedidoId: pedido.id,
          novoStatus: StatusPedido.CANCELADO,
          roleRequisitante: role,
          usuarioId: usuario.sub,
          motivo: req.body?.motivo as string | undefined ?? 'Cancelado pelo cliente',
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
