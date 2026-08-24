# 🌵 Raiz do Nordeste — API Backend

API RESTful para o sistema de restaurante/franquia **Raiz do Nordeste**, construída com **Node.js + TypeScript** seguindo **Clean Architecture**.

## 📦 Stack

| Categoria | Tecnologia |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Linguagem | TypeScript 5 (strict) |
| Framework HTTP | Express 4 |
| ORM | Prisma 6 |
| Banco de dados | PostgreSQL 15 |
| Cache | node-cache (in-memory) |
| Autenticação | JWT + bcryptjs |
| Validação | Zod |
| Testes | Jest + ts-jest |
| Logger | Pino (JSON estruturado) |
| Documentação | Swagger UI / OpenAPI 3.0 |
| Container | Docker + Docker Compose |

---

## 🚀 Setup Local — Passo a Passo

### Pré-requisitos

- **Node.js** 20 LTS ou superior
- **npm** 9+
- **Docker** e **Docker Compose** (para o PostgreSQL)
- Git

### 1. Clonar e instalar dependências

```bash
git clone <URL-DO-REPOSITORIO>
cd raizdonordeste-api-backend
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o arquivo .env com seus valores (veja tabela abaixo)
```

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://raiz_user:raiz_pass@localhost:5432/raizdonordeste?schema=public` |
| `JWT_SECRET` | Segredo do access token (≥256 bits) | — |
| `JWT_EXPIRES_IN` | Expiração do access token | `15m` |
| `JWT_REFRESH_SECRET` | Segredo do refresh token | — |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token | `7d` |
| `BCRYPT_SALT_ROUNDS` | Custo do bcrypt | `10` |
| `PORT` | Porta da API | `3000` |
| `LOG_LEVEL` | Nível de log (info/debug/warn) | `info` |
| `AUTH_RATE_LIMIT_MAX` | Max tentativas de login/min | `10` |

### 3. Subir o banco de dados

```bash
# Apenas PostgreSQL
docker-compose up -d postgres

# Verificar se está rodando
docker-compose ps
```

### 4. Executar migrations do Prisma

```bash
npm run prisma:generate   # Gera o Prisma Client
npm run prisma:migrate    # Cria/aplica migrations no banco
```

> **Nota:** O projeto usa repositórios **InMemory** por padrão em desenvolvimento (não precisa de banco para rodar/testar). O Prisma é necessário apenas para produção ou para usar `npm run prisma:studio`.

### 5. Iniciar a API em modo desenvolvimento

```bash
npm run dev
```

A API estará disponível em: **http://localhost:3000**

> O servidor usa `ts-node-dev` com hot-reload automático.

### 6. Credenciais de ADMIN (para testes)

Para testar os endpoints restritos localmente, você precisará primeiro criar o usuário administrador usando a coleção Postman (Request: `[Setup] Criar Admin`), ou você pode enviar um POST diretamente para `/usuarios` com:

**Corpo (JSON):**
```json
{
  "nome": "Admin Sistema",
  "email": "admin@raizdonordeste.com.br",
  "senha": "Admin@123456",
  "role": "ADMIN"
}
```

Após criado, basta logar na rota `POST /auth/login` passando o e-mail e senha acima.

---

## 📚 Documentação da API (Swagger)

Após iniciar a API, acesse:

**http://localhost:3000/api/docs**

A documentação Swagger UI é gerada automaticamente a partir dos comentários `@openapi` nas rotas (via `swagger-jsdoc`). Ela reflete os endpoints implementados com exemplos de request/response e códigos de status.

### Rota do Swagger

```
GET /api/docs           → Swagger UI (interface gráfica)
GET /api/docs.json      → OpenAPI 3.0 spec (JSON)
GET /health             → Health check da API
```

---

## 🧪 Executar os Testes

### Testes unitários (sem banco/rede)

```bash
npm run test
```

### Com relatório de cobertura

```bash
npm run test:coverage
```

> Meta de cobertura: ≥ 80% nas camadas `domain` e `application`.

### Resultado esperado

```
Test Suites: 9 passed, 9 total
Tests:       59 passed, 59 total
```

---

## 📮 Coleção Postman/Insomnia

**Arquivo:** `raizdonordeste-postman-collection.json`

### Como importar no Postman

1. Abra o Postman
2. Clique em **Import** → **File**
3. Selecione `raizdonordeste-postman-collection.json`
4. A coleção aparecerá com 7 pastas e 29 requisições

### Ordem de execução recomendada

```
1. Auth → [Setup] Criar Admin
2. Auth → T01: Login Admin        (salva adminToken)
3. Setup → Criar Unidade           (salva unidadeId)
4. Setup → Criar Categoria         (salva categoriaId)
5. Setup → Criar Produto           (salva produtoId)
6. Setup → Criar Produto Negado    (salva produtoNegadoId)
7. Setup → Dar Entrada de Estoque (50 unidades)
8. Setup → Dar Entrada Estoque produto negado
9. Setup → Auto-Registro Cliente   (salva clienteId)
10. Fidelidade → T07: Login Cliente (salva clienteToken)
11. Fidelidade → Aderir ao Programa
12. Validacao → T05, T06           (erros de input)
13. Pedidos → T08 a T15            (fluxo principal)
14. Auditoria → T16                (logs)
15. Erros Extras
```

> Os tokens são salvos automaticamente nas variáveis de coleção via scripts `pm.collectionVariables.set(...)`.

### Ambiente

A coleção já inclui a variável `baseUrl = http://localhost:3000`. Não é necessário criar um environment separado.

---

## 📊 DER — Modelo de Dados

O diagrama Entidade-Relacionamento está em: **`docs/DER-raiz-do-nordeste.png`**

### Principais tabelas e relacionamentos

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Usuários do sistema (roles: CLIENTE, ATENDENTE, COZINHA, GERENTE, ADMIN) |
| `unidades` | Franquias/restaurantes da rede |
| `produtos` | Catálogo de produtos |
| `categorias` | Categorias de produto |
| `cardapio_unidade` | Cardápio por unidade (produto × unidade, com preço específico) |
| `estoques` | Estoque por unidade × produto |
| `movimentacoes_estoque` | Histórico de entradas/saídas/ajustes de estoque |
| `pedidos` | Pedidos multicanal (APP, TOTEM, BALCAO, PICKUP, WEB) |
| `itens_pedido` | Itens de um pedido (produto × quantidade × desconto) |
| `pagamentos` | Transações de pagamento (mock) |
| `fidelidade` | Saldo de pontos por cliente |
| `extratos_fidelidade` | Histórico de acúmulo/resgate de pontos |
| `campanhas` | Campanhas promocionais |
| `campanha_produto` | Relação campanha × produtos elegíveis |

---

## 🏗️ Arquitetura

O projeto segue **Clean Architecture** com 4 camadas:

```
src/
├── domain/           # Entidades, enums, erros, interfaces de repositório
│   ├── entities/     # Pedido, Estoque, Fidelidade, Campanha...
│   ├── enums/        # StatusPedido, CanalPedido, Role...
│   ├── errors/       # DomainErrors (tipados)
│   └── repositories/ # Interfaces (ports) dos repositórios
│
├── application/      # Use cases, services, ports de saída
│   ├── use-cases/    # CriarPedidoUseCase, LoginUseCase...
│   ├── services/     # PromocaoService, FidelidadeService, TokenService
│   └── ports/        # IGatewayPagamento, ILogger, ITokenService...
│
├── infrastructure/   # Implementações concretas
│   ├── database/     # Repositórios InMemory (dev/teste); Prisma (produção)
│   ├── gateways/     # MockGatewayPagamento
│   ├── logger/       # PinoLogger (JSON estruturado, LGPD redact)
│   └── cache/        # NodeCacheAdapter
│
├── api/              # Camada HTTP
│   ├── routes/       # Rotas com documentação @openapi
│   ├── middlewares/  # authMiddleware, rbacMiddleware, errorHandler
│   ├── dto/          # Schemas Zod (validação de entrada)
│   └── docs/         # swagger.config.ts
│
└── tests/
    └── unit/         # Testes unitários (sem rede/DB)
        ├── domain/   # Entidades de domínio
        └── use-cases/# Use cases com fakes
```

---

## 🔑 Principais Endpoints

| Método | Rota | Autenticação | Descrição |
|--------|------|-------------|-----------|
| POST | `/auth/login` | Pública | Login → tokens JWT |
| POST | `/auth/refresh` | Pública | Renovar access token |
| POST | `/auth/logout` | JWT | Logout |
| POST | `/auth/registrar` | Pública | Auto-cadastro de clientes (novo) |
| POST | `/usuarios` | JWT + ADMIN/GERENTE | Criar usuário (funcionários) |
| GET | `/usuarios/me` | JWT | Meu perfil |
| POST | `/unidades` | JWT + ADMIN | Criar unidade |
| GET | `/unidades` | Pública | Listar unidades ativas |
| POST | `/categorias` | JWT + GERENTE/ADMIN | Criar categoria |
| GET | `/categorias` | Pública | Listar categorias |
| POST | `/produtos` | JWT + GERENTE/ADMIN | Criar produto |
| GET | `/produtos` | Pública | Listar produtos |
| POST | `/estoque/entradas` | JWT + GERENTE/ADMIN | Registrar entrada de estoque |
| GET | `/estoque` | JWT + GERENTE/ADMIN | Listar estoque por unidade |
| POST | `/pedidos` | JWT (ou anônimo TOTEM) | **Criar pedido** (fluxo principal) |
| GET | `/pedidos` | JWT + ATENDENTE/GERENTE/ADMIN | Listar pedidos |
| GET | `/pedidos/:id` | JWT | Detalhes do pedido |
| PATCH | `/pedidos/:id/status` | JWT + roles específicos | Atualizar status |
| DELETE | `/pedidos/:id` | JWT | Cancelar pedido |
| POST | `/fidelidade/aderir` | JWT + CLIENTE | Aderir ao programa (LGPD opt-in) |
| GET | `/fidelidade/saldo` | JWT + CLIENTE | Consultar pontos |
| POST | `/campanhas` | JWT + GERENTE/ADMIN | Criar campanha |
| GET | `/campanhas/ativas` | Pública | Campanhas em vigor |

Documentação completa: **http://localhost:3000/api/docs**

---

## 🔐 Segurança e LGPD

- **Senhas**: armazenadas com bcrypt (custo ≥ 10), nunca em texto plano
- **JWT**: Access token (15min) + Refresh token (7d), algoritmo HS256
- **RBAC**: 5 roles — `CLIENTE`, `ATENDENTE`, `COZINHA`, `GERENTE`, `ADMIN`
- **Rate limiting**: 10 tentativas/min em `/auth/login` por IP
- **Helmet**: headers de segurança HTTP configurados
- **Logs**: JSON estruturado via Pino com campos PII redactados automaticamente
- **LGPD**: 
  - Fidelidade com **opt-in explícito** (`consentimento: true` obrigatório)
  - `DELETE /usuarios/:id` anonimiza dados pessoais
  - Auditoria registrada para ações sensíveis

---

## 🐳 Docker

```bash
# Apenas PostgreSQL
docker-compose up -d postgres

# API + banco completo
docker-compose up

# Parar tudo
docker-compose down
```

---

## 📋 Evidências

- **Repositório:** `<URL-DO-REPOSITORIO>`
- **Swagger UI local:** http://localhost:3000/api/docs
- **Rota da spec JSON:** http://localhost:3000/api/docs.json
- **Coleção Postman/Insomnia:** `raizdonordeste-postman-collection.json` (na raiz do repositório)
- **DER:** `docs/DER-raiz-do-nordeste.png`
- **Cenários de teste:** `docs/cenarios-de-teste.md`

---

## 📁 Estrutura do Repositório

```
raizdonordeste-api-backend/
├── src/                          # Código-fonte
├── prisma/schema.prisma          # Schema do banco (PostgreSQL)
├── docs/
│   ├── requisitos-e-casos-de-uso.md
│   ├── api-reference.md
│   ├── cenarios-de-teste.md      # 16 cenários documentados
│   └── DER-raiz-do-nordeste.png  # Diagrama ER
├── raizdonordeste-postman-collection.json
├── .env.example                  # Template de variáveis de ambiente
├── docker-compose.yml
├── Dockerfile
├── jest.config.ts
├── tsconfig.json
└── README.md
```
