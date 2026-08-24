import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Raiz do Nordeste — API Backend',
      version: '1.0.0',
      description: `
## API do sistema de restaurante/franquia Raiz do Nordeste

Gerencia pedidos multicanal (APP, TOTEM, BALCÃO, PICKUP, WEB), cardápio por unidade, 
estoque, programa de fidelidade, promoções e pagamento via gateway mock.

### Autenticação
Utilize o header \`Authorization: Bearer {token}\` em todos os endpoints autenticados.

### Padrão de Erro
Todas as respostas de erro seguem o formato:
\`\`\`json
{
  "error": {
    "code": "CODIGO_ERRO",
    "message": "Mensagem descritiva",
    "details": [{ "campo": "nome.campo", "msg": "Detalhe" }],
    "timestamp": "2026-08-07T14:00:00.000Z",
    "path": "/recurso"
  }
}
\`\`\`

### canalPedido (Obrigatório)
Todo pedido deve incluir o campo \`canalPedido\`. Valores aceitos: \`APP\`, \`TOTEM\`, \`BALCAO\`, \`PICKUP\`, \`WEB\`.
      `,
      contact: {
        name: 'Equipe Raiz do Nordeste',
        email: 'dev@raizdonordeste.com.br',
      },
      license: { name: 'ISC' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desenvolvimento' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via POST /auth/login',
        },
      },
      schemas: {
        ErroResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Dados de entrada inválidos.' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      campo: { type: 'string' },
                      msg: { type: 'string' },
                    },
                  },
                },
                timestamp: { type: 'string', format: 'date-time' },
                path: { type: 'string' },
              },
            },
          },
        },
        Paginacao: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            total: { type: 'integer' },
          },
        },
        CanalPedido: {
          type: 'string',
          enum: ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'],
        },
        StatusPedido: {
          type: 'string',
          enum: ['PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'],
        },
        Role: {
          type: 'string',
          enum: ['CLIENTE', 'ATENDENTE', 'COZINHA', 'GERENTE', 'ADMIN'],
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticação e renovação de tokens' },
      { name: 'Usuários', description: 'Cadastro e perfil de usuários' },
      { name: 'Unidades', description: 'Gestão de unidades da franquia' },
      { name: 'Cardápio', description: 'Cardápio por unidade, produtos e categorias' },
      { name: 'Estoque', description: 'Controle de estoque e movimentações' },
      { name: 'Pedidos', description: 'Criação e gestão de pedidos multicanal' },
      { name: 'Pagamentos', description: 'Pagamento mock e status de transações' },
      { name: 'Fidelidade', description: 'Programa de pontos opt-in (LGPD)' },
      { name: 'Campanhas', description: 'Promoções e campanhas com desconto' },
    ],
  },
  apis: ['./src/api/routes/*.ts', './src/api/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
