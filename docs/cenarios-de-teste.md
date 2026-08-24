# Cenários de Teste — Raiz do Nordeste API v1.0

> **Fluxo adotado:** Fluxo A — Pedido → Pagamento Mock → Atualização de Status  
> **Coleção Postman:** `raizdonordeste-postman-collection.json`  
> **Testes unitários:** `npm run test` (59 testes, 9 suites)

---

## Resumo dos Cenários

| ID | Tipo | Cobertura | Status |
|----|------|-----------|--------|
| T01 | ✅ Positivo | Autenticação — login válido | ✅ |
| T02 | ❌ Negativo | Autenticação — sem token (401) | ✅ |
| T03 | ❌ Negativo | Autorização — perfil sem permissão (403) | ✅ |
| T04 | ❌ Negativo | Autenticação — credenciais inválidas (401) | ✅ |
| T05 | ❌ Negativo | Validação — campo obrigatório ausente (422) | ✅ |
| T06 | ❌ Negativo | Validação — formato inválido (e-mail) (422) | ✅ |
| T07 | ✅ Positivo | Autenticação — login cliente + captura token | ✅ |
| T08 | ✅ Positivo | Pedido com itens válidos → APROVADO (201) | ✅ |
| T09 | ✅ Positivo | Consultar pedido por ID (200) | ✅ |
| T10 | ✅ Positivo | Transitar status EM_PREPARO → PRONTO (204) | ✅ |
| T11 | ✅ Positivo | Pagamento mock NEGADO → pedido CANCELADO (402) | ✅ |
| T12 | ❌ Negativo | Pedido com produto inexistente (404) | ✅ |
| T13 | ❌ Negativo | Pedido com estoque insuficiente (422) | ✅ |
| T14 | ❌ Negativo | Transição de status inválida (422) | ✅ |
| T15 | ✅ Positivo | Pedido TOTEM anônimo sem token (201) | ✅ |
| T16 | ✅ Positivo | Log de auditoria: entrada de estoque | ✅ |

**Total: 16 cenários — 8 positivos, 8 negativos** ✅ *(mínimo exigido: 10, sendo 6+ positivos e 4+ negativos)*

---

## Padrão de Erro da API

Todos os erros seguem o formato:

```json
{
  "error": {
    "code": "CODIGO_ERRO",
    "message": "Mensagem descritiva.",
    "details": [{ "campo": "canalPedido", "msg": "Campo obrigatório" }],
    "timestamp": "2026-08-21T17:00:00.000Z",
    "path": "/pedidos"
  }
}
```

---

## a) Autenticação e Autorização

### T01 — Login com token válido (POSITIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T01 |
| **Endpoint** | `POST /auth/login` |
| **Pré-condição** | Usuário ADMIN cadastrado |
| **Entrada (body)** | `{ "email": "admin@raizdonordeste.com.br", "senha": "Admin@123456" }` |
| **Status esperado** | `200 OK` |
| **Response (trecho)** | `{ "accessToken": "eyJ...", "refreshToken": "eyJ...", "usuario": { "role": "ADMIN" } }` |
| **Evidência** | Request `T01 — [+] Login Admin` na coleção Postman, pasta **Auth** |

---

### T02 — Acesso sem token (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T02 |
| **Endpoint** | `GET /pedidos` |
| **Pré-condição** | Nenhuma |
| **Entrada** | Sem header `Authorization` |
| **Status esperado** | `401 Unauthorized` |
| **Response (trecho)** | `{ "error": { "code": "TOKEN_INVALIDO", "message": "..." } }` |
| **Evidência** | Request `T02 — [-] Acesso sem token` na coleção Postman, pasta **Auth** |

---

### T03 — Acesso com perfil sem permissão (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T03 |
| **Endpoint** | `GET /pedidos` |
| **Pré-condição** | Token de CLIENTE válido (`clienteToken`) |
| **Entrada** | `Authorization: Bearer {{clienteToken}}` |
| **Status esperado** | `403 Forbidden` |
| **Response (trecho)** | `{ "error": { "code": "PERMISSAO_NEGADA", "message": "..." } }` |
| **Regra** | `GET /pedidos` exige role ATENDENTE, GERENTE ou ADMIN (RBAC) |
| **Evidência** | Request `T03 — [-] Acesso com perfil sem permissao` na coleção Postman, pasta **Auth** |

---

### T04 — Login com credenciais inválidas (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T04 |
| **Endpoint** | `POST /auth/login` |
| **Pré-condição** | Nenhuma |
| **Entrada (body)** | `{ "email": "admin@raizdonordeste.com.br", "senha": "SenhaErrada999" }` |
| **Status esperado** | `401 Unauthorized` |
| **Response (trecho)** | `{ "error": { "code": "CREDENCIAIS_INVALIDAS", "message": "..." } }` |
| **Evidência** | Request `T04 — [-] Login com credenciais invalidas` na coleção Postman, pasta **Auth** |

---

## b) Validação de Dados

### T05 — Campo obrigatório ausente (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T05 |
| **Endpoint** | `POST /pedidos` |
| **Pré-condição** | Token ADMIN válido |
| **Entrada (body)** | `{ "unidadeId": "...", "itens": [...], "formaPagamento": "MOCK" }` *(sem `canalPedido`)* |
| **Status esperado** | `422 Unprocessable Entity` |
| **Response (trecho)** | `{ "error": { "code": "VALIDATION_ERROR", "details": [{ "campo": "canalPedido", "msg": "Required" }] } }` |
| **Regra** | RF-04.2: `canalPedido` é obrigatório |
| **Evidência** | Request `T05 — [-] Campo obrigatorio ausente` na coleção Postman, pasta **Validacao de Dados** |

---

### T06 — Formato inválido (e-mail malformado) (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T06 |
| **Endpoint** | `POST /usuarios` |
| **Pré-condição** | Token ADMIN válido |
| **Entrada (body)** | `{ "nome": "Teste", "email": "email-invalido-sem-arroba", "senha": "Senha@123", "role": "CLIENTE" }` |
| **Status esperado** | `422 Unprocessable Entity` |
| **Response (trecho)** | `{ "error": { "code": "VALIDATION_ERROR", "details": [{ "campo": "email", "msg": "Invalid email" }] } }` |
| **Evidência** | Request `T06 — [-] Tipo invalido — email mal formado` na coleção Postman, pasta **Validacao de Dados** |

---

## c) Regras de Negócio — Fluxo Principal (Pedidos)

### T07 — Login Cliente (POSITIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T07 |
| **Endpoint** | `POST /auth/login` |
| **Pré-condição** | Cliente cadastrado via [Setup] |
| **Entrada (body)** | `{ "email": "joao@cliente.com", "senha": "Cliente@123" }` |
| **Status esperado** | `200 OK` |
| **Response (trecho)** | `{ "accessToken": "eyJ...", "usuario": { "role": "CLIENTE" } }` |
| **Evidência** | Request `T07 — [+] Login Cliente` na coleção Postman, pasta **Fidelidade** |

---

### T08 — Pedido com itens válidos → APROVADO (POSITIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T08 |
| **Endpoint** | `POST /pedidos` |
| **Pré-condição** | clienteToken válido; unidadeId ATIVA; produtoId com estoque ≥ 2; canalPedido informado |
| **Entrada (body)** | `{ "canalPedido": "APP", "unidadeId": "...", "itens": [{ "produtoId": "...", "quantidade": 2 }], "formaPagamento": "MOCK" }` |
| **Status esperado** | `201 Created` |
| **Response (trecho)** | `{ "pedido": { "status": "EM_PREPARO", "numeroPedido": "#0001", "canalPedido": "APP" }, "pagamento": { "status": "APROVADO", "payload": { "transacaoId": "APR-..." } } }` |
| **Regras** | RF-04.1, RF-04.4, RF-04.5, RF-08.1, RF-08.2, RF-08.3 |
| **Evidência** | Request `T08 — [+] Criar Pedido itens validos — APROVADO` na coleção Postman, pasta **Pedidos** |

---

### T09 — Consultar pedido por ID (POSITIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T09 |
| **Endpoint** | `GET /pedidos/{id}` |
| **Pré-condição** | pedidoId válido (executar T08 antes); token do cliente que criou |
| **Entrada (path)** | `/pedidos/{{pedidoId}}` |
| **Status esperado** | `200 OK` |
| **Response (trecho)** | `{ "id": "...", "itens": [{ "nomeProduto": "Tapioca de Frango", "quantidade": 2, ... }] }` |
| **Evidência** | Request `T09 — [+] Consultar Pedido por ID` na coleção Postman, pasta **Pedidos** |

---

### T10 — Transitar status EM_PREPARO → PRONTO (POSITIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T10 |
| **Endpoint** | `PATCH /pedidos/{id}/status` |
| **Pré-condição** | Pedido em `EM_PREPARO`; token de ADMIN (simula COZINHA) |
| **Entrada (body)** | `{ "novoStatus": "PRONTO", "motivo": "Pedido finalizado na cozinha" }` |
| **Status esperado** | `204 No Content` |
| **Response** | Sem corpo |
| **Regras** | RF-04.5, RF-04.6, RF-04.7: COZINHA → PRONTO |
| **Evidência** | Request `T10 — [+] Transitar Pedido: EM_PREPARO para PRONTO` na coleção Postman, pasta **Pedidos** |

---

### T12 — Pedido com produto inexistente (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T12 |
| **Endpoint** | `POST /pedidos` |
| **Pré-condição** | clienteToken válido; UUID de produto inexistente |
| **Entrada (body)** | `{ "canalPedido": "APP", "unidadeId": "...", "itens": [{ "produtoId": "00000000-0000-0000-0000-000000000000", "quantidade": 1 }], "formaPagamento": "MOCK" }` |
| **Status esperado** | `404 Not Found` |
| **Response (trecho)** | `{ "error": { "code": "RECURSO_NAO_ENCONTRADO", "message": "Estoque não encontrado para produto 00000000..." } }` |
| **Evidência** | Request `T12 — [-] Pedido com produto inexistente` na coleção Postman, pasta **Pedidos** |

---

### T13 — Pedido com estoque insuficiente (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T13 |
| **Endpoint** | `POST /pedidos` |
| **Pré-condição** | Estoque disponível = 50 (do setup); `quantidade: 99999` |
| **Entrada (body)** | `{ "canalPedido": "APP", "unidadeId": "...", "itens": [{ "produtoId": "...", "quantidade": 99999 }], "formaPagamento": "MOCK" }` |
| **Status esperado** | `422 Unprocessable Entity` |
| **Response (trecho)** | `{ "error": { "code": "ESTOQUE_INSUFICIENTE", "message": "Estoque insuficiente para o produto..." } }` |
| **Regras** | RF-04.4: sistema valida estoque ANTES de criar o pedido |
| **Evidência** | Request `T13 — [-] Pedido com estoque insuficiente` na coleção Postman, pasta **Pedidos** |

---

### T14 — Transição de status inválida (NEGATIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T14 |
| **Endpoint** | `PATCH /pedidos/{id}/status` |
| **Pré-condição** | Pedido em `PRONTO` (executar T10 antes) |
| **Entrada (body)** | `{ "novoStatus": "PENDENTE" }` |
| **Status esperado** | `422 Unprocessable Entity` |
| **Response (trecho)** | `{ "error": { "code": "TRANSICAO_STATUS_INVALIDA", "message": "Transição PRONTO → PENDENTE não permitida" } }` |
| **Regras** | RF-04.6: máquina de estados estrita |
| **Evidência** | Request `T14 — [-] Transicao de status invalida` na coleção Postman, pasta **Pedidos** |

---

## d) Pagamento Mock e Atualização de Status

### T11 — Pagamento mock NEGADO → Pedido CANCELADO (POSITIVO — cenário de erro de negócio)

| Campo | Valor |
|-------|-------|
| **ID** | T11 |
| **Endpoint** | `POST /pedidos` |
| **Pré-condição** | clienteToken válido; produtoNegadoId com precoBase=0.005 e estoque suficiente |
| **Entrada (body)** | `{ "canalPedido": "APP", "unidadeId": "...", "itens": [{ "produtoId": "{{produtoNegadoId}}", "quantidade": 1 }], "formaPagamento": "CARTAO_CREDITO" }` |
| **Status esperado** | `402 Payment Required` |
| **Response (trecho)** | `{ "error": { "code": "PAGAMENTO_NEGADO", "message": "Pagamento recusado pelo gateway." } }` |
| **Regras** | RF-08.5: gateway NEGADO → pedido CANCELADO, estoque estornado automaticamente |
| **Comportamento do mock** | Valor total < R$ 0.01 → mock retorna `NEGADO` |
| **Evidência** | Request `T11 — [+] Pagamento Mock Negado` na coleção Postman, pasta **Pedidos** |

**Resultado após T11:**
- Pedido transitado para `CANCELADO`
- Estoque estornado (retorna à quantidade original)
- Transação de pagamento registrada com status `NEGADO`

### T15 — Pedido TOTEM anônimo (POSITIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T15 |
| **Endpoint** | `POST /pedidos` |
| **Pré-condição** | Sem token JWT; unidadeId e produtoId válidos; estoque suficiente |
| **Entrada (body)** | `{ "canalPedido": "TOTEM", "unidadeId": "...", "itens": [...], "formaPagamento": "MOCK" }` |
| **Status esperado** | `201 Created` |
| **Response (trecho)** | `{ "pedido": { "canalPedido": "TOTEM", "clienteId": null, "status": "EM_PREPARO" } }` |
| **Regras** | RF-04.1: pedidos via TOTEM podem ser anônimos |
| **Evidência** | Request `T15 — [+] Pedido via TOTEM anonimo sem token` na coleção Postman, pasta **Pedidos** |

---

## e) Logs e Auditoria

### T16 — Log de auditoria gerado em ação sensível (POSITIVO)

| Campo | Valor |
|-------|-------|
| **ID** | T16 |
| **Endpoint** | `POST /estoque/entradas` |
| **Pré-condição** | adminToken válido; unidadeId e produtoId válidos |
| **Entrada (body)** | `{ "unidadeId": "...", "produtoId": "...", "quantidade": 10, "motivo": "Teste de auditoria" }` |
| **Status esperado** | `201 Created` |
| **Response (trecho)** | `{ "id": "...", "tipo": "ENTRADA", "quantidade": 10 }` |
| **Evidência** | Request `T16 — [+] Log de auditoria: entrada de estoque` na coleção Postman, pasta **Auditoria e Logs** |

**Log emitido no stdout da API:**
```json
{
  "level": 30,
  "audit": true,
  "acao": "ESTOQUE_ENTRADA",
  "usuarioId": "<id-do-usuario>",
  "entidade": "Estoque",
  "entidadeId": "<id-do-estoque>",
  "ip": "::1",
  "quantidade": 10,
  "produtoId": "<id>",
  "unidadeId": "<id>",
  "timestamp": "2026-08-21T17:00:00.000Z",
  "msg": "AUDITORIA: ESTOQUE_ENTRADA"
}
```

**Ações sensíveis auditadas pelo sistema (RNF-02.1):**

| Ação | Trigger | Campo `acao` no log |
|------|---------|---------------------|
| Login | `POST /auth/login` | `LOGIN_REALIZADO` |
| Criar pedido | `POST /pedidos` | `PEDIDO_CRIADO` |
| Cancelar pedido | `PATCH /pedidos/:id/status` (CANCELADO) | `PEDIDO_CANCELADO` |
| Entrada de estoque | `POST /estoque/entradas` | `ESTOQUE_ENTRADA` |
| Aderir à fidelidade | `POST /fidelidade/aderir` | `FIDELIDADE_ADESAO` |
| Anonimizar usuário | `DELETE /usuarios/:id` | `USUARIO_ANONIMIZADO` |

> **Observação:** Os campos PII (email, senha, senhaHash, cpf, telefone, token) são automaticamente substituídos por `[REDACTED]` pelo PinoLogger (LGPD — RNF-02.2), garantindo conformidade com a lei.

---

## Testes Unitários (Jest)

Além da coleção Postman, o projeto possui **59 testes unitários** cobrindo os mesmos cenários em nível de use-case:

```
npm run test       # Executa todos os 59 testes
npm run test:coverage  # Com relatório de cobertura
```

| Suite de Testes | Testes | Cobertura |
|-----------------|--------|-----------|
| `CriarPedidoUseCase.spec.ts` | 7 | Fluxo principal de pedidos |
| `TransitarStatusPedidoUseCase.spec.ts` | 7 | Máquina de estados + RBAC |
| `LoginUseCase.spec.ts` | 3 | Autenticação |
| `CriarUsuarioUseCase.spec.ts` | 4 | Criação de usuário + RBAC |
| `AderirFidelidadeUseCase.spec.ts` | 5 | Programa de fidelidade (LGPD) |
| `Pedido.spec.ts` (domain) | 9 | Entidade Pedido + máquina de estados |
| `Estoque.spec.ts` (domain) | 9 | Entidade Estoque |
| `Fidelidade.spec.ts` (domain) | 7 | Entidade Fidelidade |
| `Campanha.spec.ts` (domain) | 8 | Entidade Campanha |

**Todos os 59 testes passam ✅**
