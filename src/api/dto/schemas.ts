import { z } from 'zod';
import { CanalPedido } from '../../domain/enums/CanalPedido';
import { StatusPedido } from '../../domain/enums/StatusPedido';
import { Role } from '../../domain/enums/Role';

// ─── Paginação ───────────────────────────────────────────────────────────────
export const PaginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken é obrigatório.'),
});

// ─── Usuários ─────────────────────────────────────────────────────────────────
export const CriarUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.').max(120),
  email: z.string().email('E-mail inválido.'),
  senha: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres.')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula.')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número.'),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: `Role inválida. Valores aceitos: ${Object.values(Role).join(', ')}` }) }),
});

// ─── Unidades ─────────────────────────────────────────────────────────────────
export const CriarUnidadeSchema = z.object({
  nome: z.string().min(2).max(120),
  endereco: z.string().min(5).max(255),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos (sem pontuação).'),
  telefone: z.string().min(10).max(15),
});

export const AtualizarUnidadeSchema = CriarUnidadeSchema.partial().extend({
  status: z.enum(['ATIVA', 'INATIVA']).optional(),
});

// ─── Produtos ─────────────────────────────────────────────────────────────────
export const CriarProdutoSchema = z.object({
  nome: z.string().min(2).max(120),
  descricao: z.string().max(500).optional(),
  precoBase: z.number().positive('Preço deve ser positivo.'),
  imagemUrl: z.string().url('URL de imagem inválida.').optional(),
  categoriaId: z.string().uuid('categoriaId deve ser um UUID válido.'),
});

export const AtualizarItemCardapioSchema = z.object({
  precoEspecifico: z.number().positive().optional(),
  ativo: z.boolean().optional(),
});

export const AdicionarAoCardapioSchema = z.object({
  produtoId: z.string().uuid(),
  precoEspecifico: z.number().positive().optional(),
});

// ─── Categorias ───────────────────────────────────────────────────────────────
export const CriarCategoriaSchema = z.object({
  nome: z.string().min(2).max(60),
  descricao: z.string().max(255).optional(),
});

// ─── Estoque ──────────────────────────────────────────────────────────────────
export const EntradaEstoqueSchema = z.object({
  unidadeId: z.string().uuid(),
  produtoId: z.string().uuid(),
  quantidade: z.number().positive('Quantidade deve ser positiva.'),
  unidadeMedida: z.string().min(1).max(10).default('UN'),
  motivo: z.string().min(3).max(255),
});

export const AjusteEstoqueSchema = z.object({
  novaQuantidade: z.number().min(0, 'Quantidade não pode ser negativa.'),
  motivo: z.string().min(3).max(255),
});

// ─── Pedidos ──────────────────────────────────────────────────────────────────
export const ItemPedidoSchema = z.object({
  produtoId: z.string().uuid('produtoId deve ser um UUID válido.'),
  quantidade: z.number().int().positive('Quantidade deve ser um inteiro positivo.'),
});

export const CriarPedidoSchema = z.object({
  canalPedido: z.nativeEnum(CanalPedido, {
    errorMap: () => ({
      message: `canalPedido é obrigatório e deve ser um dos valores: ${Object.values(CanalPedido).join(', ')}.`,
    }),
  }),
  unidadeId: z.string().uuid('unidadeId deve ser um UUID válido.'),
  itens: z
    .array(ItemPedidoSchema)
    .min(1, 'O pedido deve conter ao menos 1 item.'),
  formaPagamento: z.string().min(1, 'formaPagamento é obrigatório.'),
  pontosParaResgatar: z.number().int().min(0).optional().default(0),
});

export const TransitarStatusSchema = z.object({
  novoStatus: z.nativeEnum(StatusPedido, {
    errorMap: () => ({
      message: `novoStatus inválido. Valores aceitos: ${Object.values(StatusPedido).join(', ')}.`,
    }),
  }),
  motivo: z.string().max(255).optional(),
});

export const FiltrosPedidoSchema = z.object({
  canalPedido: z.nativeEnum(CanalPedido).optional(),
  status: z.nativeEnum(StatusPedido).optional(),
  unidadeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ─── Fidelidade ───────────────────────────────────────────────────────────────
export const AderirFidelidadeSchema = z.object({
  consentimento: z.literal(true, {
    errorMap: () => ({
      message: 'É necessário consentir explicitamente (consentimento: true) para aderir ao programa (LGPD).',
    }),
  }),
});

export const ResgatarPontosSchema = z.object({
  pontos: z.number().int().positive('Pontos a resgatar devem ser positivos.'),
});

// ─── Campanhas ────────────────────────────────────────────────────────────────
export const CriarCampanhaSchema = z.object({
  nome: z.string().min(2).max(120),
  tipo: z.enum(['PERCENTUAL', 'VALOR_FIXO']),
  valor: z.number().positive(),
  unidadeId: z.string().uuid().optional(),
  dataInicio: z.string().datetime({ message: 'dataInicio deve ser uma data ISO 8601 válida.' }),
  dataFim: z.string().datetime({ message: 'dataFim deve ser uma data ISO 8601 válida.' }),
  produtoIds: z.array(z.string().uuid()).min(1, 'A campanha deve incluir ao menos um produto.'),
}).refine(
  (data) => new Date(data.dataFim) > new Date(data.dataInicio),
  { message: 'dataFim deve ser posterior a dataInicio.', path: ['dataFim'] },
);
