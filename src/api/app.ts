import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.config';
import { errorHandler } from './middlewares/errorHandler';

// Rotas
import { authRouter } from './routes/auth.routes';
import { usuariosRouter } from './routes/usuarios.routes';
import { unidadesRouter } from './routes/unidades.routes';
import { estoqueRouter } from './routes/estoque.routes';
import { fidelidadeRouter } from './routes/fidelidade.routes';
import { pedidosRouter } from './routes/pedidos.routes';
import { produtosRouter } from './routes/produtos.routes';
import { categoriasRouter } from './routes/categorias.routes';
import { campanhasRouter } from './routes/campanhas.routes';

// Infraestrutura
import { PinoLogger } from '../infrastructure/logger/PinoLogger';
import { NodeCacheAdapter } from '../infrastructure/cache/NodeCacheAdapter';
import { MockGatewayPagamento } from '../infrastructure/gateways/pagamento-mock/MockGatewayPagamento';

// Services
import { TokenService } from '../application/services/TokenService';
import { PromocaoService } from '../application/services/PromocaoService';
import { FidelidadeService } from '../application/services/FidelidadeService';

// Repositórios — InMemory (trocar por implementações Prisma em produção)
import { InMemoryUsuarioRepository } from '../infrastructure/database/repositories/InMemoryUsuarioRepository';
import { InMemoryUnidadeRepository } from '../infrastructure/database/repositories/InMemoryUnidadeRepository';
import { InMemoryEstoqueRepository } from '../infrastructure/database/repositories/InMemoryEstoqueRepository';
import { InMemoryPedidoRepository } from '../infrastructure/database/repositories/InMemoryPedidoRepository';
import { InMemoryPagamentoRepository } from '../infrastructure/database/repositories/InMemoryPagamentoRepository';
import { InMemoryFidelidadeRepository } from '../infrastructure/database/repositories/InMemoryFidelidadeRepository';
import { InMemoryCampanhaRepository } from '../infrastructure/database/repositories/InMemoryCampanhaRepository';
import { InMemoryProdutoRepository } from '../infrastructure/database/repositories/InMemoryProdutoRepository';
import { InMemoryCategoriaRepository } from '../infrastructure/database/repositories/InMemoryCategoriaRepository';
import { Role } from '../domain/enums/Role';
import type { IUsuarioRepository } from '../domain/repositories/IUsuarioRepository';

/**
 * Cria o usuário ADMIN padrão na inicialização (apenas se não existir).
 * Credenciais: admin@raizdonordeste.com.br / Admin@123456
 */
async function seedAdmin(usuarioRepository: IUsuarioRepository, logger: PinoLogger): Promise<void> {
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@raizdonordeste.com.br';
  const adminSenha = process.env['SEED_ADMIN_SENHA'] ?? 'Admin@123456';

  const jaExiste = await usuarioRepository.existeEmail(adminEmail);
  if (jaExiste) return;

  const saltRounds = Number(process.env['BCRYPT_SALT_ROUNDS'] ?? 10);
  const senhaHash = await bcrypt.hash(adminSenha, saltRounds);

  await usuarioRepository.criar({
    id: uuidv4(),
    nome: 'Admin Sistema',
    email: adminEmail,
    senhaHash,
    role: Role.ADMIN,
    fidelidadeOptIn: false,
  });

  logger.info('Seed: usuário ADMIN padrão criado', { email: adminEmail });
}

export function createApp() {
  const app = express();

  // ─── Segurança ─────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // ─── Serviços de infraestrutura ────────────────────────────────────────────
  const logger = new PinoLogger();
  const cache = new NodeCacheAdapter();
  const tokenService = new TokenService();
  const gatewayPagamento = new MockGatewayPagamento();

  // ─── Repositórios (in-memory para dev/teste; trocar por Prisma em produção) ─
  const usuarioRepository = new InMemoryUsuarioRepository();
  const unidadeRepository = new InMemoryUnidadeRepository();
  const estoqueRepository = new InMemoryEstoqueRepository();
  const pedidoRepository = new InMemoryPedidoRepository();
  const pagamentoRepository = new InMemoryPagamentoRepository();
  const fidelidadeRepository = new InMemoryFidelidadeRepository();
  const campanhaRepository = new InMemoryCampanhaRepository();
  const produtoRepository = new InMemoryProdutoRepository();
  const categoriaRepository = new InMemoryCategoriaRepository();

  // ─── Services de aplicação ─────────────────────────────────────────────────
  const promocaoService = new PromocaoService(campanhaRepository);
  const fidelidadeService = new FidelidadeService(fidelidadeRepository, logger);

  // ─── Rotas ─────────────────────────────────────────────────────────────────
  app.use('/auth', authRouter({ usuarioRepository, tokenService, logger }));
  app.use('/usuarios', usuariosRouter({ usuarioRepository, tokenService, logger }));
  app.use('/unidades', unidadesRouter({ unidadeRepository, tokenService, logger, cache }));
  app.use('/estoque', estoqueRouter({ estoqueRepository, tokenService, logger }));
  app.use('/fidelidade', fidelidadeRouter({ fidelidadeRepository, usuarioRepository, tokenService, logger }));
  app.use(
    '/pedidos',
    pedidosRouter({
      pedidoRepository,
      estoqueRepository,
      pagamentoRepository,
      unidadeRepository,
      gatewayPagamento,
      promocaoService,
      fidelidadeService,
      tokenService,
      logger,
    }),
  );
  app.use('/produtos', produtosRouter({ produtoRepository, tokenService, logger, cache }));
  app.use('/categorias', categoriasRouter({ categoriaRepository, tokenService, logger }));
  app.use('/campanhas', campanhasRouter({ campanhaRepository, tokenService, logger }));

  // ─── Swagger UI ────────────────────────────────────────────────────────────
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Raiz do Nordeste — API Docs',
      customCss: '.swagger-ui .topbar { background: #8B1A1A; }',
    }),
  );

  // ─── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  });

  // ─── Error Handler (deve ser o último middleware) ──────────────────────────
  app.use(errorHandler);

  // ─── Seed: ADMIN padrão ────────────────────────────────────────────────────
  // Cria o primeiro usuário ADMIN na inicialização para permitir o uso do Swagger.
  // Credenciais padrão: admin@raizdonordeste.com.br / Admin@123456
  // Sobrescreva via variáveis: SEED_ADMIN_EMAIL e SEED_ADMIN_SENHA
  seedAdmin(usuarioRepository, logger).catch((err) =>
    logger.error('Falha ao criar seed do ADMIN', { error: String(err) }),
  );

  return app;
}
