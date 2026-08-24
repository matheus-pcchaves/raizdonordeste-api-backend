import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, rbacMiddleware } from '../middlewares/authMiddleware';
import { validarBody, validarQuery } from '../middlewares/errorHandler';
import { AderirFidelidadeSchema, ResgatarPontosSchema, PaginacaoSchema } from '../dto/schemas';
import { AderirFidelidadeUseCase } from '../../application/use-cases/fidelidade/AderirFidelidadeUseCase';
import { FidelidadeService } from '../../application/services/FidelidadeService';
import { Role } from '../../domain/enums/Role';
import { RecursoNaoEncontradoError } from '../../domain/errors/DomainErrors';
import type { IFidelidadeRepository } from '../../domain/repositories/IFidelidadeRepository';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository';
import type { ITokenService } from '../../application/ports/ITokenService';
import type { ILogger } from '../../application/ports/ILogger';

export function fidelidadeRouter(deps: {
  fidelidadeRepository: IFidelidadeRepository;
  usuarioRepository: IUsuarioRepository;
  tokenService: ITokenService;
  logger: ILogger;
}): Router {
  const router = Router();
  const auth = authMiddleware(deps.tokenService);
  const apenasCliente = rbacMiddleware(Role.CLIENTE);

  const fidelidadeService = new FidelidadeService(deps.fidelidadeRepository, deps.logger);
  const aderirUC = new AderirFidelidadeUseCase(
    deps.fidelidadeRepository,
    deps.usuarioRepository,
    deps.logger,
  );

  /**
   * @openapi
   * /fidelidade/aderir:
   *   post:
   *     tags: [Fidelidade]
   *     summary: Aderir ao programa de fidelidade (opt-in LGPD)
   *     description: >
   *       O campo `consentimento: true` é obrigatório para registrar o opt-in
   *       conforme a LGPD (RF-06.1).
   *     security: [{ BearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [consentimento]
   *             properties:
   *               consentimento:
   *                 type: boolean
   *                 enum: [true]
   *                 description: Deve ser true para registrar o consentimento LGPD
   *     responses:
   *       201: { description: Adesão realizada, saldo inicial = 0 }
   *       409: { description: Já inscrito no programa }
   *       422: { description: Consentimento não fornecido }
   */
  router.post(
    '/aderir',
    auth,
    apenasCliente,
    validarBody(AderirFidelidadeSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await aderirUC.execute({
          clienteId: req.usuario!.sub,
          consentimento: req.body.consentimento as boolean,
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
   * /fidelidade/saldo:
   *   get:
   *     tags: [Fidelidade]
   *     summary: Consultar saldo de pontos
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200: { description: Saldo atual de pontos }
   *       404: { description: Não inscrito no programa }
   */
  router.get(
    '/saldo',
    auth,
    apenasCliente,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const fidelidade = await deps.fidelidadeRepository.buscarPorClienteId(req.usuario!.sub);
        if (!fidelidade) throw new RecursoNaoEncontradoError('Fidelidade', req.usuario!.sub);
        res.json({
          pontosSaldo: fidelidade.pontosSaldo,
          atualizadoEm: fidelidade.atualizadoEm,
          equivalenteEmReais: fidelidadeService.calcularDescontoEmReais(fidelidade.pontosSaldo),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * @openapi
   * /fidelidade/extrato:
   *   get:
   *     tags: [Fidelidade]
   *     summary: Histórico de pontos (extrato)
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200: { description: Extrato de pontos paginado }
   */
  router.get(
    '/extrato',
    auth,
    apenasCliente,
    validarQuery(PaginacaoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 10);
        const result = await deps.fidelidadeRepository.listarExtrato(
          req.usuario!.sub,
          page,
          limit,
        );
        res.json({ data: result.extratos, pagination: { page, limit, total: result.total } });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
