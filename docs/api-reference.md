# API Reference — Raiz do Nordeste

> **Versão:** 1.0.0 | **Base URL:** `http://localhost:3000` | **Swagger UI:** `/api/docs`

---

## Convenções Gerais

| Aspecto | Padrão |
|---|---|
| Formato | JSON (`Content-Type: application/json`) |
| Autenticação | Bearer JWT (`Authorization: Bearer <accessToken>`) |
| URLs | Plural, kebab-case — `/pedidos`, `/unidades`, `/produtos` |
| IDs | UUIDs v4 no path (`/pedidos/:id`) |
| Paginação | Query params `?page=1&limit=10` em todos os GETs de listagem |
| Erros | JSON padronizado (ver [Padrão de Erro](#padrão-de-erro)) |
| Datas | ISO 8601 (`2026-08-10T17:00:00.000Z`) |

### Padrão de Erro

Todos os erros retornam o mesmo contrato:

```json
{
  "codigo": "ESTOQUE_INSUFICIENTE",
  "mensagem": "Produto 'Tapioca de Frango' não possui estoque suficiente.",
  "detalhes": [
    { "msg": "Estoque disponível: 2, solicitado: 5" }
  ],
  "timestamp": "2026-08-10T17:00:00.000Z"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `codigo` | string | Código de erro tipado (ex: `ESTOQUE_INSUFICIENTE`) |
| `mensagem` | string | Descrição legível |
| `detalhes` | array? | Lista de campos/mensagens de validação (apenas para erros 422) |
| `timestamp` | string | ISO 8601 do momento do erro |

### Códigos de Status HTTP

| Status | Quando |
|---|---|
| `200 OK` | Consulta ou atualização bem-sucedida |
| `201 Created` | Recurso criado |
| `204 No Content` | Exclusão ou atualização sem corpo de retorno |
| `400 Bad Request` | Erro de negócio simples |
| `401 Unauthorized` | Token ausente, inválido ou expirado |
| `403 Forbidden` | Token válido mas permissão negada (RBAC) |
| `404 Not Found` | Recurso não encontrado |
| `409 Conflict` | Duplicidade ou conflito de regra de negócio |
| `422 Unprocessable Entity` | Erro de validação de schema (Zod) |
| `500 Internal Server Error` | Erro interno inesperado |

### Roles (RBAC)

| Role | Descrição |
|---|---|
| `ADMIN` | Acesso total a todos os recursos |
| `GERENTE` | Gerencia unidades, produtos, campanhas e pedidos de sua unidade |
| `ATENDENTE` | Acesso a pedidos (leitura + entrega/cancelamento) |
| `COZINHA` | Atualiza pedido para PRONTO |
| `CLIENTE` | Cria pedidos, consulta próprio histórico e fidelidade |

---

## /auth — Autenticação

### `POST /auth/login`

Autentica um usuário com e-mail e senha. Retorna um par de tokens JWT.

**Autenticação:** Pública

**Body:**
```json
{
  "email": "joao@raizdonordeste.com.br",
  "senha": "Senha@123"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `email` | string | ✅ | E-mail válido |
| `senha` | string | ✅ | Mínimo 6 caracteres |

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "nome": "João Silva",
    "email": "joao@raizdonordeste.com.br",
    "role": "CLIENTE"
  }
}
```

| Status | Código de Erro | Quando |
|---|---|---|
| `200` | — | Credenciais válidas |
| `401` | `CREDENCIAIS_INVALIDAS` | E-mail não encontrado ou senha incorreta |
| `422` | `VALIDATION_ERROR` | Body com campos faltando ou inválidos |

> **LGPD:** A senha nunca é retornada. O log de auditoria registra apenas o `usuarioId` e o IP — sem dados pessoais em texto plano.

---

### `POST /auth/refresh`

Obtém novo `accessToken` a partir de um `refreshToken` válido.

**Autenticação:** Pública

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Status | Código de Erro | Quando |
|---|---|---|
| `200` | — | Token renovado |
| `401` | `TOKEN_INVALIDO` | Token inválido, expirado ou não é do tipo `refresh` |

---

## /usuarios — Usuários

### `POST /usuarios`

Cria um novo usuário no sistema.

**Autenticação:** ADMIN, GERENTE  
**Regra RBAC:** GERENTE só pode criar usuários com role `ATENDENTE`, `COZINHA` ou `CLIENTE`. Apenas ADMIN cria GERENTE ou ADMIN.

**Body:**
```json
{
  "nome": "Maria Souza",
  "email": "maria@raizdonordeste.com.br",
  "senha": "Senha@456",
  "role": "ATENDENTE"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nome` | string | ✅ | 2–120 caracteres |
| `email` | string | ✅ | Formato e-mail válido |
| `senha` | string | ✅ | Mínimo 8 chars, 1 maiúscula, 1 número |
| `role` | string | ✅ | `ADMIN`, `GERENTE`, `ATENDENTE`, `COZINHA`, `CLIENTE` |

**Response 201:**
```json
{
  "id": "7fa85f64-5717-4562-b3fc-2c963f66afa9",
  "nome": "Maria Souza",
  "email": "maria@raizdonordeste.com.br",
  "role": "ATENDENTE",
  "criadoEm": "2026-08-10T17:00:00.000Z"
}
```

| Status | Código de Erro | Quando |
|---|---|---|
| `201` | — | Usuário criado |
| `401` | `TOKEN_INVALIDO` | Não autenticado |
| `403` | `PERMISSAO_NEGADA` | GERENTE tentando criar ADMIN/GERENTE |
| `409` | `CONFLICT` | E-mail já cadastrado |
| `422` | `VALIDATION_ERROR` | Campos inválidos |

> **LGPD:** A senha é armazenada exclusivamente como hash bcrypt (nunca em texto plano). O campo `senhaHash` é [REDACTED] em todos os logs (Pino `redact`).

---

### `GET /usuarios`

Lista todos os usuários (excluindo dados sensíveis).

**Autenticação:** ADMIN  
**Query Params:** `?page=1&limit=10`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome": "Maria Souza",
      "email": "maria@raizdonordeste.com.br",
      "role": "ATENDENTE",
      "fidelidadeOptIn": false
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1 }
}
```

---

### `GET /usuarios/:id`

Retorna dados de um usuário específico. Clientes só podem ver o próprio perfil.

**Autenticação:** JWT (qualquer role para o próprio ID; ADMIN para qualquer ID)

**Response 200:**
```json
{
  "id": "uuid",
  "nome": "Maria Souza",
  "email": "maria@raizdonordeste.com.br",
  "role": "ATENDENTE",
  "fidelidadeOptIn": false,
  "criadoEm": "2026-08-10T17:00:00.000Z"
}
```

| Status | Código de Erro | Quando |
|---|---|---|
| `200` | — | Usuário encontrado |
| `403` | `PERMISSAO_NEGADA` | Cliente tentando ver outro usuário |
| `404` | `RECURSO_NAO_ENCONTRADO` | ID inválido |

---

### `DELETE /usuarios/:id/dados-pessoais`

Anonimiza todos os dados pessoais do usuário (LGPD — direito ao esquecimento).

**Autenticação:** ADMIN  
**Efeito:** Substitui nome, e-mail e telefone por valores anonimizados. Mantém o histórico de pedidos (por ID) sem PII.

**Response 204:** Sem corpo.

| Status | Código de Erro | Quando |
|---|---|---|
| `204` | — | Dados anonimizados |
| `403` | `PERMISSAO_NEGADA` | Não é ADMIN |
| `404` | `RECURSO_NAO_ENCONTRADO` | Usuário não encontrado |

> **LGPD Base Legal:** Cumprimento de obrigação legal (Art. 7º, II, LGPD). Auditoria registrada com timestamp e ID do operador.

---

## /unidades — Unidades (Franquias)

### `POST /unidades`

Cria uma nova unidade da rede.

**Autenticação:** ADMIN  

**Body:**
```json
{
  "nome": "Raiz do Nordeste — Fortaleza Centro",
  "endereco": "Av. Beira Mar, 100 — Meireles, Fortaleza/CE",
  "cnpj": "12345678000195",
  "telefone": "85911112222"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nome` | string | ✅ | 2–120 caracteres |
| `endereco` | string | ✅ | 5–255 caracteres |
| `cnpj` | string | ✅ | 14 dígitos numéricos (sem pontuação) |
| `telefone` | string | ✅ | 10–15 caracteres |

**Response 201:**
```json
{
  "id": "uuid",
  "nome": "Raiz do Nordeste — Fortaleza Centro",
  "cnpj": "12345678000195",
  "status": "ATIVA",
  "criadoEm": "2026-08-10T17:00:00.000Z"
}
```

| Status | Código de Erro | Quando |
|---|---|---|
| `201` | — | Unidade criada |
| `409` | `CONFLICT` | CNPJ duplicado |
| `422` | `VALIDATION_ERROR` | CNPJ inválido ou campos faltando |

---

### `GET /unidades`

Lista unidades com paginação.

**Autenticação:** Pública  
**Query Params:** `?page=1&limit=10&apenasAtivas=true`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome": "Raiz do Nordeste — Fortaleza Centro",
      "endereco": "Av. Beira Mar, 100",
      "status": "ATIVA"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1 }
}
```

---

### `GET /unidades/:id`

Detalhes de uma unidade específica. Resultado com cache de 120s.

**Autenticação:** Pública

---

### `PATCH /unidades/:id`

Atualiza dados de uma unidade.

**Autenticação:** ADMIN, GERENTE  
**Body:** Qualquer subconjunto dos campos de criação + `status: "ATIVA" | "INATIVA"`

---

### `DELETE /unidades/:id`

Inativa uma unidade (soft delete — nunca remove do banco).

**Autenticação:** ADMIN  
**Response 204:** Sem corpo.

---

## /categorias — Categorias de Produto

### `POST /categorias`

Cria categoria de produto.

**Autenticação:** GERENTE, ADMIN

**Body:**
```json
{
  "nome": "Tapiocas",
  "descricao": "Tapiocas artesanais do nordeste"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "nome": "Tapiocas",
  "descricao": "Tapiocas artesanais do nordeste"
}
```

---

### `GET /categorias`

Lista todas as categorias.

**Autenticação:** Pública

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "nome": "Tapiocas", "descricao": "..." }
  ]
}
```

---

### `GET /categorias/:id`

Detalhes de uma categoria.

**Autenticação:** Pública

| Status | Quando |
|---|---|
| `200` | Categoria encontrada |
| `404` | Categoria não encontrada |

---

## /produtos — Produtos e Cardápio

### `POST /produtos`

Cria um novo produto no catálogo.

**Autenticação:** GERENTE, ADMIN

**Body:**
```json
{
  "nome": "Tapioca de Frango",
  "descricao": "Tapioca recheada com frango desfiado e queijo coalho",
  "precoBase": 18.90,
  "imagemUrl": "https://cdn.raizdonordeste.com.br/tapioca-frango.jpg",
  "categoriaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nome` | string | ✅ | 2–120 caracteres |
| `descricao` | string | ❌ | Máximo 500 caracteres |
| `precoBase` | number | ✅ | Positivo |
| `imagemUrl` | string | ❌ | URL válida |
| `categoriaId` | string | ✅ | UUID válido |

**Response 201:**
```json
{
  "id": "uuid",
  "nome": "Tapioca de Frango",
  "precoBase": 18.90,
  "status": "DISPONIVEL",
  "categoriaId": "uuid"
}
```

---

### `GET /produtos`

Lista produtos com paginação opcional por categoria.

**Autenticação:** Pública  
**Query Params:** `?page=1&limit=10&categoriaId=uuid`

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "nome": "Tapioca de Frango", "precoBase": 18.90, "status": "DISPONIVEL" }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1 }
}
```

---

### `GET /produtos/:id`

Detalhes de um produto.

**Autenticação:** Pública

---

### `PATCH /produtos/:id`

Atualiza dados de um produto.

**Autenticação:** GERENTE, ADMIN  
**Body:** Campos opcionais: `nome`, `descricao`, `precoBase`, `imagemUrl`, `categoriaId`

---

### `DELETE /produtos/:id`

Remove um produto do catálogo.

**Autenticação:** ADMIN  
**Response 204:** Sem corpo.

---

### `POST /produtos/cardapio/:unidadeId`

Adiciona um produto ao cardápio de uma unidade específica.

**Autenticação:** GERENTE, ADMIN

**Body:**
```json
{
  "produtoId": "uuid",
  "precoEspecifico": 19.90
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `produtoId` | string (UUID) | ✅ | Produto a adicionar |
| `precoEspecifico` | number | ❌ | Preço específico para esta unidade (se omitido, usa `precoBase`) |

**Response 201:**
```json
{ "message": "Produto adicionado ao cardápio." }
```

---

### `PATCH /produtos/cardapio/:unidadeId/:produtoId`

Atualiza preço ou disponibilidade de um item no cardápio de uma unidade.

**Autenticação:** GERENTE, ADMIN

**Body:**
```json
{
  "precoEspecifico": 20.00,
  "ativo": false
}
```

**Response 204:** Sem corpo.

---

### `DELETE /produtos/cardapio/:unidadeId/:produtoId`

Remove produto do cardápio de uma unidade.

**Autenticação:** GERENTE, ADMIN  
**Response 204:** Sem corpo.

---

## /estoque — Controle de Estoque

### `POST /estoque/entrada`

Registra entrada de estoque (compra ou reposição).

**Autenticação:** GERENTE, ADMIN

**Body:**
```json
{
  "unidadeId": "uuid",
  "produtoId": "uuid",
  "quantidade": 50,
  "unidadeMedida": "UN",
  "motivo": "Reposição semanal"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `unidadeId` | UUID | ✅ | — |
| `produtoId` | UUID | ✅ | — |
| `quantidade` | number | ✅ | Positivo |
| `unidadeMedida` | string | ❌ | Padrão: `UN` |
| `motivo` | string | ✅ | 3–255 caracteres |

**Response 201:**
```json
{
  "estoqueId": "uuid",
  "produtoId": "uuid",
  "quantidade": 50,
  "unidadeId": "uuid"
}
```

---

### `GET /estoque/:unidadeId`

Lista estoque de uma unidade com paginação.

**Autenticação:** GERENTE, ADMIN  
**Query Params:** `?page=1&limit=10`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "produtoId": "uuid",
      "quantidade": 45,
      "unidadeMedida": "UN",
      "quantidadeMinima": 5,
      "atualizadoEm": "2026-08-10T17:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1 }
}
```

---

### `PATCH /estoque/:estoqueId/ajuste`

Ajuste manual do estoque (inventário ou perda).

**Autenticação:** GERENTE, ADMIN

**Body:**
```json
{
  "novaQuantidade": 40,
  "motivo": "Ajuste de inventário"
}
```

**Response 204:** Sem corpo.

---

### `GET /estoque/:unidadeId/:produtoId/movimentacoes`

Histórico de movimentações de um produto na unidade.

**Autenticação:** GERENTE, ADMIN  
**Query Params:** `?page=1&limit=20`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "SAIDA",
      "quantidade": 2,
      "motivo": "Pedido #0001",
      "usuarioId": "uuid",
      "criadoEm": "2026-08-10T17:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

> **RF-05.5:** O sistema emite log `WARN` automático quando o estoque atinge o nível mínimo configurado (`quantidadeMinima`). O GERENTE deve monitorar os logs de auditoria.

---

## /pedidos — Pedidos

### `POST /pedidos`

Cria um novo pedido com pagamento integrado ao gateway mock.

**Autenticação:** CLIENTE, ATENDENTE, GERENTE, ADMIN

**Body:**
```json
{
  "canalPedido": "APP",
  "unidadeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "itens": [
    { "produtoId": "uuid-tapioca", "quantidade": 2 },
    { "produtoId": "uuid-suco", "quantidade": 1 }
  ],
  "formaPagamento": "PIX",
  "pontosParaResgatar": 50
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `canalPedido` | string | ✅ | `APP`, `WEB`, `TOTEM`, `BALCAO` |
| `unidadeId` | UUID | ✅ | Unidade ativa |
| `itens` | array | ✅ | Mínimo 1 item |
| `itens[].produtoId` | UUID | ✅ | — |
| `itens[].quantidade` | integer | ✅ | Positivo |
| `formaPagamento` | string | ✅ | `PIX`, `CARTAO_CREDITO`, `DINHEIRO`, `MOCK` |
| `pontosParaResgatar` | integer | ❌ | Padrão: 0 |

**Response 201 (pagamento aprovado):**
```json
{
  "pedido": {
    "id": "uuid",
    "numeroPedido": "#0001",
    "status": "EM_PREPARO",
    "valorTotal": 35.80,
    "descontoTotal": 2.00,
    "canalPedido": "APP"
  },
  "pagamento": {
    "status": "APROVADO",
    "payload": {
      "transacaoId": "APR-1728574920000",
      "valor": 35.80,
      "metodoPagamento": "PIX",
      "autorizacao": "A3F8K2",
      "timestamp": "2026-08-10T17:00:00.000Z"
    }
  }
}
```

| Status | Código de Erro | Quando |
|---|---|---|
| `201` | — | Pedido criado e pagamento aprovado |
| `402` | `PAGAMENTO_NEGADO` | Gateway recusou o pagamento; estoque estornado automaticamente |
| `404` | `RECURSO_NAO_ENCONTRADO` | Unidade ou produto não encontrado |
| `409` | `UNIDADE_INATIVA` | Unidade não aceita pedidos |
| `422` | `ESTOQUE_INSUFICIENTE` | Produto sem estoque suficiente |
| `422` | `VALIDATION_ERROR` | `canalPedido` ausente ou inválido |
| `503` | `PAGAMENTO_PENDENTE` | Timeout do gateway de pagamento |

> **Regra de negócio (RF-04.5):** O pedido é criado com status `AGUARDANDO_PAGAMENTO` e avança para `EM_PREPARO` apenas após confirmação do gateway. Se recusado, cancela e estorna estoque automaticamente.

---

### `GET /pedidos`

Lista pedidos com filtros e paginação.

**Autenticação:** JWT (CLIENTE vê apenas os próprios; ATENDENTE/GERENTE vê por unidade; ADMIN vê tudo)

**Query Params:**
| Param | Tipo | Descrição |
|---|---|---|
| `canalPedido` | string | `APP`, `WEB`, `TOTEM`, `BALCAO` |
| `status` | string | Ex: `EM_PREPARO`, `PRONTO` |
| `unidadeId` | UUID | Filtrar por unidade |
| `page` | integer | Padrão: 1 |
| `limit` | integer | Padrão: 10, máximo: 100 |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "numeroPedido": "#0001",
      "status": "EM_PREPARO",
      "canalPedido": "APP",
      "valorTotal": 35.80,
      "criadoEm": "2026-08-10T17:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1 }
}
```

---

### `GET /pedidos/:id`

Detalhes completos de um pedido com itens.

**Autenticação:** JWT (CLIENTE apenas o próprio; outros roles sem restrição de propriedade)

**Response 200:**
```json
{
  "id": "uuid",
  "numeroPedido": "#0001",
  "clienteId": "uuid",
  "unidadeId": "uuid",
  "canalPedido": "APP",
  "status": "EM_PREPARO",
  "valorTotal": 35.80,
  "descontoTotal": 2.00,
  "itens": [
    {
      "produtoId": "uuid",
      "nomeProduto": "Tapioca de Frango",
      "quantidade": 2,
      "precoUnitario": 18.90,
      "descontoAplicado": 1.00,
      "origemDesconto": "CAMPANHA:uuid:Promo Verão"
    }
  ],
  "criadoEm": "2026-08-10T17:00:00.000Z"
}
```

---

### `PATCH /pedidos/:id/status`

Transita o status de um pedido (máquina de estados).

**Autenticação:** ATENDENTE, COZINHA, GERENTE, ADMIN  
**Regras RBAC:**
- `COZINHA`: pode transitar para `PRONTO`
- `ATENDENTE`, `GERENTE`, `ADMIN`: podem transitar para `ENTREGUE` ou `CANCELADO`

**Body:**
```json
{
  "novoStatus": "PRONTO",
  "motivo": "Pedido finalizado na cozinha"
}
```

**Máquina de estados válida:**
```
PENDENTE → AGUARDANDO_PAGAMENTO | CANCELADO
AGUARDANDO_PAGAMENTO → CONFIRMADO | CANCELADO
CONFIRMADO → EM_PREPARO | CANCELADO
EM_PREPARO → PRONTO
PRONTO → ENTREGUE
ENTREGUE → (terminal)
CANCELADO → (terminal)
```

**Response 204:** Sem corpo.

| Status | Código de Erro | Quando |
|---|---|---|
| `204` | — | Status atualizado |
| `403` | `PERMISSAO_NEGADA` | Role não autorizada para a transição |
| `404` | `RECURSO_NAO_ENCONTRADO` | Pedido não encontrado |
| `422` | `TRANSICAO_STATUS_INVALIDA` | Transição não permitida pela máquina de estados |

> **RF-04.11:** Cancelamento automaticamente estorna o estoque de todos os itens do pedido.

---

## /fidelidade — Programa de Fidelidade

> **LGPD:** A adesão ao programa exige consentimento explícito (`consentimento: true`). O opt-in é registrado em auditoria com timestamp e IP. O cliente pode cancelar o opt-in a qualquer momento.

### `POST /fidelidade/aderir`

Inscreve o cliente no programa de pontos. Requer consentimento explícito (LGPD opt-in).

**Autenticação:** CLIENTE (apenas para si mesmo)

**Body:**
```json
{
  "consentimento": true
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `consentimento` | boolean | ✅ | Deve ser literalmente `true` |

**Response 201:**
```json
{
  "fidelidadeId": "uuid",
  "pontosSaldo": 0,
  "mensagem": "Você foi inscrito no programa de fidelidade com sucesso."
}
```

| Status | Código de Erro | Quando |
|---|---|---|
| `201` | — | Adesão realizada |
| `409` | `CONFLICT` | `consentimento: false` — LGPD bloqueou a ação |
| `409` | `CONFLICT` | Cliente já inscrito |
| `404` | `RECURSO_NAO_ENCONTRADO` | Cliente não encontrado |

---

### `GET /fidelidade/saldo`

Consulta o saldo de pontos do cliente autenticado.

**Autenticação:** CLIENTE

**Response 200:**
```json
{
  "fidelidadeId": "uuid",
  "pontosSaldo": 350,
  "clienteId": "uuid"
}
```

---

### `GET /fidelidade/extrato`

Histórico de acúmulo e resgate de pontos.

**Autenticação:** CLIENTE  
**Query Params:** `?page=1&limit=10`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "ACUMULO",
      "pontos": 35,
      "pedidoId": "uuid",
      "criadoEm": "2026-08-10T17:00:00.000Z"
    },
    {
      "id": "uuid",
      "tipo": "RESGATE",
      "pontos": -50,
      "pedidoId": "uuid",
      "criadoEm": "2026-08-09T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 2 }
}
```

---

## /campanhas — Campanhas Promocionais

### `POST /campanhas`

Cria uma campanha promocional.

**Autenticação:** GERENTE (para sua unidade), ADMIN (para toda a rede)

**Body:**
```json
{
  "nome": "Promo Verão",
  "tipo": "PERCENTUAL",
  "valor": 10,
  "unidadeId": "uuid",
  "dataInicio": "2026-08-01T00:00:00.000Z",
  "dataFim": "2026-08-31T23:59:59.000Z",
  "produtoIds": ["uuid-tapioca", "uuid-suco"]
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nome` | string | ✅ | 2–120 caracteres |
| `tipo` | string | ✅ | `PERCENTUAL` ou `VALOR_FIXO` |
| `valor` | number | ✅ | Positivo. Para `PERCENTUAL`: percentual (ex: `10` = 10%) |
| `unidadeId` | UUID | ❌ | Se omitido (ADMIN), aplica-se a toda a rede |
| `dataInicio` | ISO 8601 | ✅ | — |
| `dataFim` | ISO 8601 | ✅ | Deve ser posterior a `dataInicio` |
| `produtoIds` | UUID[] | ✅ | Mínimo 1 produto |

**Response 201:**
```json
{
  "id": "uuid",
  "nome": "Promo Verão",
  "tipo": "PERCENTUAL",
  "valor": 10,
  "ativa": true,
  "dataInicio": "2026-08-01T00:00:00.000Z",
  "dataFim": "2026-08-31T23:59:59.000Z",
  "produtoIds": ["uuid-tapioca"]
}
```

---

### `GET /campanhas`

Lista todas as campanhas com paginação.

**Autenticação:** GERENTE, ADMIN  
**Query Params:** `?page=1&limit=10`

---

### `GET /campanhas/ativas`

Lista campanhas atualmente ativas (vigentes no momento da consulta).

**Autenticação:** Pública  
**Query Params:** `?unidadeId=uuid`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome": "Promo Verão",
      "tipo": "PERCENTUAL",
      "valor": 10,
      "produtoIds": ["uuid-tapioca"]
    }
  ]
}
```

---

### `GET /campanhas/:id`

Detalhes de uma campanha.

**Autenticação:** GERENTE, ADMIN

---

### `PATCH /campanhas/:id`

Atualiza dados de uma campanha.

**Autenticação:** GERENTE, ADMIN  
**Body:** Campos opcionais: `nome`, `ativa`, `valor`, `dataFim`

---

### `DELETE /campanhas/:id`

Remove uma campanha.

**Autenticação:** ADMIN  
**Response 204:** Sem corpo.

---

## LGPD e Segurança

### Dados pessoais coletados

| Dado | Finalidade | Base Legal (LGPD) | Retenção |
|---|---|---|---|
| Nome | Identificação do usuário | Execução de contrato (Art. 7º, V) | Enquanto conta ativa; anonimizado após exclusão |
| E-mail | Autenticação e comunicação | Execução de contrato (Art. 7º, V) | Idem |
| Senha | Autenticação | Execução de contrato | Armazenada apenas como hash bcrypt (nunca texto plano) |
| Histórico de pedidos | Faturamento e comprovação | Obrigação legal (Art. 7º, II) | 5 anos (contábil) |
| Pontos de fidelidade | Benefícios ao cliente | Consentimento explícito (Art. 7º, I) | Enquanto fidelidade ativa; expiram conforme regra |
| IP de acesso | Segurança e auditoria | Legítimo interesse (Art. 7º, IX) | 90 dias nos logs |

### Controles implementados

| Controle | Implementação |
|---|---|
| **Hash de senha** | bcrypt com salt rounds configurável (`BCRYPT_SALT_ROUNDS`) |
| **Redação de PII em logs** | Pino `redact`: `email`, `senha`, `senhaHash`, `cpf`, `telefone`, `token` → `[REDACTED]` |
| **RBAC** | Middleware `rbacMiddleware` valida role do JWT antes de executar o use-case |
| **Audit trail** | `PinoLogger.auditoria()` registra ações sensíveis: criação/cancelamento de pedido, adesão à fidelidade, anonimização |
| **Consentimento explícito** | `POST /fidelidade/aderir` rejeita `consentimento: false` com `ConflictError` |
| **Direito ao esquecimento** | `DELETE /usuarios/:id/dados-pessoais` anonimiza nome, email e telefone |
| **JWT** | Access token (curta duração) + Refresh token (longa duração); algoritmo HS256 |
| **Rate limiting** | `express-rate-limit` aplicado em toda a API |
| **Headers de segurança** | `helmet` configurado globalmente |
| **HTTPS** | Obrigatório em produção (configuração do load balancer/reverse proxy) |

### Testando com Gateway Mock

O gateway de pagamento mock (`MockGatewayPagamento`) simula comportamentos de forma determinística:

| Valor do pedido | Comportamento |
|---|---|
| `< 0.01` | NEGADO |
| Centavos `.99` (ex: `18.99`) | Timeout → `PAGAMENTO_PENDENTE` |
| Qualquer outro | APROVADO |

---

## Testando com Postman / Insomnia

### Fluxo completo de exemplo

1. **Criar conta ADMIN:** `POST /usuarios` (com roleRequisitante ADMIN no token inicial)
2. **Login:** `POST /auth/login` → salvar `accessToken`
3. **Criar unidade:** `POST /unidades` (usar token ADMIN)
4. **Criar categoria:** `POST /categorias`
5. **Criar produto:** `POST /produtos`
6. **Adicionar ao cardápio:** `POST /produtos/cardapio/:unidadeId`
7. **Dar entrada no estoque:** `POST /estoque/entrada`
8. **Login como CLIENTE:** `POST /auth/login`
9. **Aderir à fidelidade:** `POST /fidelidade/aderir` com `{ "consentimento": true }`
10. **Criar pedido:** `POST /pedidos` com `canalPedido: "APP"`
11. **Acompanhar status:** `GET /pedidos/:id`
12. **Documentação interativa:** `GET /api/docs` (Swagger UI)
