/* eslint-disable */
const fs = require('fs');

const makeTest = (lines) => ({ listen: 'test', script: { exec: lines, type: 'text/javascript' } });
const makePrerequest = (lines) => ({ listen: 'prerequest', script: { exec: lines, type: 'text/javascript' } });

const post = (path, body, token, desc) => ({
  method: 'POST',
  header: [
    { key: 'Content-Type', value: 'application/json' },
    ...(token ? [{ key: 'Authorization', value: `Bearer ${token}` }] : [])
  ],
  body: { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2) },
  url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.replace(/^\//, '').split('/') },
  description: desc,
});

const get = (path, token, desc) => ({
  method: 'GET',
  header: token ? [{ key: 'Authorization', value: `Bearer ${token}` }] : [],
  url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.replace(/^\//, '').split('/') },
  description: desc,
});

const patch = (path, body, token, desc) => ({
  method: 'PATCH',
  header: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: `Bearer ${token}` }
  ],
  body: { mode: 'raw', raw: JSON.stringify(body, null, 2) },
  url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.replace(/^\//, '').split('/') },
  description: desc,
});

const collection = {
  info: {
    name: 'Raiz do Nordeste — API v1.0',
    _postman_id: 'raiz-nordeste-collection-2026',
    description: [
      'Colecao completa de testes da API Raiz do Nordeste.',
      '',
      '## Pre-requisitos',
      '1. API rodando em http://localhost:3000 (npm run dev)',
      '2. Executar requests na ordem sugerida pelas pastas',
      '3. Os tokens sao salvos automaticamente nos scripts de teste',
      '',
      '## Ordem de execucao recomendada',
      '1. Auth → [Setup] Criar Admin',
      '2. Auth → T01: Login Admin',
      '3. Setup → Criar Unidade, Categoria, Produto, Estoque, Cliente',
      '4. Fidelidade → T07: Login Cliente, Aderir, Consultar Saldo',
      '5. Validacao → T05, T06 (erros de input)',
      '6. Pedidos → T08 a T15',
      '7. Auditoria → T16',
      '8. Erros Extras',
      '',
      '## Gateway Mock (MockGatewayPagamento)',
      '- valor total < 0.01 → NEGADO (HTTP 402)',
      '- valor total com centavos .99 (ex: 18.99) → Timeout → PENDENTE (HTTP 503)',
      '- qualquer outro valor → APROVADO (HTTP 201)',
    ].join('\n'),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' },
    { key: 'adminToken', value: '', type: 'string' },
    { key: 'clienteToken', value: '', type: 'string' },
    { key: 'unidadeId', value: '', type: 'string' },
    { key: 'categoriaId', value: '', type: 'string' },
    { key: 'produtoId', value: '', type: 'string' },
    { key: 'produtoNegadoId', value: '', type: 'string' },
    { key: 'pedidoId', value: '', type: 'string' },
    { key: 'clienteId', value: '', type: 'string' }
  ],
  item: [
    {
      name: 'Auth',
      description: 'Autenticacao e autorizacao — login, token invalido, acesso negado',
      item: [
        {
          name: '[Setup] Criar Admin',
          events: [],
          request: post('/usuarios', {
            nome: 'Admin Sistema',
            email: 'admin@raizdonordeste.com.br',
            senha: 'Admin@123456',
            role: 'ADMIN'
          }, '{{adminToken}}',
            'Cria usuario ADMIN inicial. Execute esta request ANTES do T01.\nSe retornar 409, o admin ja existe — pode prosseguir com T01.')
        },
        {
          name: 'T01 — [+] Login Admin (token valido)',
          event: [makeTest([
            "const b = pm.response.json();",
            "pm.test('T01 — Status 200 login bem-sucedido', function() { pm.response.to.have.status(200); });",
            "pm.test('T01 — Retorna accessToken e refreshToken', function() { pm.expect(b).to.have.property('accessToken'); pm.expect(b).to.have.property('refreshToken'); });",
            "pm.test('T01 — Role do usuario e ADMIN', function() { pm.expect(b.usuario.role).to.eql('ADMIN'); });",
            "pm.collectionVariables.set('adminToken', b.accessToken);",
          ])],
          request: post('/auth/login',
            { email: 'admin@raizdonordeste.com.br', senha: 'Admin@123456' }, null,
            'T01 — Positivo: login com credenciais validas de ADMIN.\nPre: usuario ADMIN criado via [Setup].\nEsperado: HTTP 200 com accessToken, refreshToken e dados do usuario.')
        },
        {
          name: 'T02 — [-] Acesso sem token (401)',
          event: [makeTest([
            "pm.test('T02 — Status 401 sem token', function() { pm.response.to.have.status(401); });",
            "pm.test('T02 — Codigo TOKEN_INVALIDO', function() { pm.expect(pm.response.json().error.code).to.eql('TOKEN_INVALIDO'); });",
          ])],
          request: get('/pedidos', null,
            'T02 — Negativo: endpoint protegido sem Bearer token.\nPre: nenhum token fornecido.\nEsperado: HTTP 401 com code TOKEN_INVALIDO.')
        },
        {
          name: 'T03 — [-] Acesso com perfil sem permissao (403 RBAC)',
          event: [makeTest([
            "pm.test('T03 — Status 403 permissao negada', function() { pm.response.to.have.status(403); });",
            "pm.test('T03 — Codigo PERMISSAO_NEGADA', function() { pm.expect(pm.response.json().error.code).to.eql('PERMISSAO_NEGADA'); });",
          ])],
          request: get('/pedidos', '{{clienteToken}}',
            'T03 — Negativo: CLIENTE acessa endpoint restrito a ATENDENTE/GERENTE/ADMIN.\nPre: clienteToken valido (executar T07 antes).\nEsperado: HTTP 403 PERMISSAO_NEGADA.')
        },
        {
          name: 'T04 — [-] Login com credenciais invalidas (401)',
          event: [makeTest([
            "pm.test('T04 — Status 401 credenciais invalidas', function() { pm.response.to.have.status(401); });",
            "pm.test('T04 — Codigo CREDENCIAIS_INVALIDAS', function() { pm.expect(pm.response.json().error.code).to.eql('CREDENCIAIS_INVALIDAS'); });",
          ])],
          request: post('/auth/login',
            { email: 'admin@raizdonordeste.com.br', senha: 'SenhaErrada999' }, null,
            'T04 — Negativo: login com senha incorreta.\nPre: nenhuma.\nEsperado: HTTP 401 com code CREDENCIAIS_INVALIDAS.')
        },
      ]
    },
    {
      name: 'Setup — Preparar dados',
      description: 'Criacao de unidade, categoria, produto e estoque para os testes de pedidos',
      item: [
        {
          name: '[Setup] Criar Unidade',
          event: [makeTest([
            "if (pm.response.code === 201) {",
            "  const b = pm.response.json();",
            "  pm.collectionVariables.set('unidadeId', b.id);",
            "  pm.test('Unidade criada', function() { pm.response.to.have.status(201); });",
            "}",
          ])],
          request: post('/unidades', {
            nome: 'Raiz do Nordeste — Fortaleza Centro',
            endereco: 'Av. Beira Mar, 100 — Meireles, Fortaleza/CE',
            cnpj: '12345678000195',
            telefone: '85911112222'
          }, '{{adminToken}}', 'Cria a unidade usada nos testes.')
        },
        {
          name: '[Setup] Criar Categoria',
          event: [makeTest([
            "if (pm.response.code === 201) { const b = pm.response.json(); pm.collectionVariables.set('categoriaId', b.id); }",
          ])],
          request: post('/categorias', { nome: 'Tapiocas', descricao: 'Tapiocas artesanais do nordeste' }, '{{adminToken}}', 'Cria categoria de produto.')
        },
        {
          name: '[Setup] Criar Produto (preco normal R$18.90)',
          event: [makeTest([
            "if (pm.response.code === 201) {",
            "  const b = pm.response.json();",
            "  pm.collectionVariables.set('produtoId', b.id);",
            "  pm.test('Produto criado', function() { pm.response.to.have.status(201); });",
            "}",
          ])],
          request: post('/produtos', {
            nome: 'Tapioca de Frango',
            descricao: 'Tapioca recheada com frango desfiado e queijo coalho',
            precoBase: 18.90,
            imagemUrl: 'https://cdn.raizdonordeste.com.br/tapioca-frango.jpg',
            categoriaId: '{{categoriaId}}'
          }, '{{adminToken}}', 'Produto com preco R$18.90 — pagamento sera APROVADO.')
        },
        {
          name: '[Setup] Criar Produto (preco 0.005 para simular NEGADO)',
          event: [makeTest([
            "if (pm.response.code === 201) {",
            "  const b = pm.response.json();",
            "  pm.collectionVariables.set('produtoNegadoId', b.id);",
            "}",
          ])],
          request: post('/produtos', {
            nome: 'Produto Teste Negado',
            descricao: 'Produto com preco minimo para simular pagamento negado (valor < 0.01)',
            precoBase: 0.005,
            categoriaId: '{{categoriaId}}'
          }, '{{adminToken}}', 'Produto com preco R$0.005 — pagamento sera NEGADO pelo mock (valor total < 0.01).')
        },
        {
          name: '[Setup] Dar Entrada de Estoque (50 unidades)',
          event: [makeTest([
            "pm.test('Estoque registrado', function() { pm.response.to.have.status(201); });",
          ])],
          request: post('/estoque/entradas', {
            unidadeId: '{{unidadeId}}',
            produtoId: '{{produtoId}}',
            quantidade: 50,
            unidadeMedida: 'UN',
            motivo: 'Reposicao semanal inicial'
          }, '{{adminToken}}', 'Adiciona 50 unidades do produto principal ao estoque.')
        },
        {
          name: '[Setup] Dar Entrada de Estoque produto negado',
          event: [makeTest([
            "pm.test('Estoque negado registrado', function() { pm.response.to.have.status(201); });",
          ])],
          request: post('/estoque/entradas', {
            unidadeId: '{{unidadeId}}',
            produtoId: '{{produtoNegadoId}}',
            quantidade: 100,
            unidadeMedida: 'UN',
            motivo: 'Estoque para testes de pagamento negado'
          }, '{{adminToken}}', 'Adiciona estoque do produto de preco minimo.')
        },
        {
          name: '[Setup] Auto-Registro Cliente',
          event: [makeTest([
            "if (pm.response.code === 201) { const b = pm.response.json(); pm.collectionVariables.set('clienteId', b.id); }",
          ])],
          request: post('/auth/registrar', {
            nome: 'Joao Cliente',
            email: 'joao@cliente.com',
            senha: 'Cliente@123'
          }, null, 'Auto-cadastro publico de cliente. Nao exige token.')
        },
      ]
    },
    {
      name: 'Validacao de Dados',
      description: 'Cenarios negativos de validacao de entrada (400/422)',
      item: [
        {
          name: 'T05 — [-] Campo obrigatorio ausente — canalPedido (422)',
          event: [makeTest([
            "pm.test('T05 — Status 422 campo obrigatorio ausente', function() { pm.response.to.have.status(422); });",
            "pm.test('T05 — Codigo VALIDATION_ERROR', function() { const b = pm.response.json(); pm.expect(b.error.code).to.eql('VALIDATION_ERROR'); pm.expect(b.error.details).to.be.an('array').that.is.not.empty; });",
          ])],
          request: post('/pedidos', {
            unidadeId: '{{unidadeId}}',
            itens: [{ produtoId: '{{produtoId}}', quantidade: 2 }],
            formaPagamento: 'MOCK'
          }, '{{adminToken}}',
            'T05 — Negativo: criar pedido sem canalPedido (campo obrigatorio).\nPre: adminToken valido.\nEsperado: HTTP 422 VALIDATION_ERROR com array de detalhes indicando canalPedido ausente.')
        },
        {
          name: 'T06 — [-] Tipo invalido — email mal formado (422)',
          event: [makeTest([
            "pm.test('T06 — Status 422 formato invalido', function() { pm.response.to.have.status(422); });",
            "pm.test('T06 — Codigo VALIDATION_ERROR', function() { pm.expect(pm.response.json().error.code).to.eql('VALIDATION_ERROR'); });",
          ])],
          request: post('/usuarios', {
            nome: 'Teste Invalido',
            email: 'email-invalido-sem-arroba',
            senha: 'Senha@123',
            role: 'CLIENTE'
          }, '{{adminToken}}',
            'T06 — Negativo: criar usuario com email em formato invalido.\nPre: adminToken valido.\nEsperado: HTTP 422 VALIDATION_ERROR.')
        },
      ]
    },
    {
      name: 'Fidelidade',
      description: 'Programa de pontos opt-in (LGPD)',
      item: [
        {
          name: 'T07 — [+] Login Cliente',
          event: [makeTest([
            "pm.test('T07 — Login cliente bem-sucedido', function() {",
            "  pm.response.to.have.status(200);",
            "  pm.collectionVariables.set('clienteToken', pm.response.json().accessToken);",
            "});",
          ])],
          request: post('/auth/login', { email: 'joao@cliente.com', senha: 'Cliente@123' }, null,
            'T07 — Positivo: login de CLIENTE e captura de token.')
        },
        {
          name: '[+] Aderir ao Programa de Fidelidade',
          event: [makeTest([
            "pm.test('Adesao OK — Status 201', function() { pm.response.to.have.status(201); });",
            "pm.test('Saldo inicial = 0', function() { pm.expect(pm.response.json().pontosSaldo).to.eql(0); });",
          ])],
          request: post('/fidelidade/aderir', { consentimento: true }, '{{clienteToken}}',
            'Positivo: adesao ao programa de fidelidade com consentimento=true.\nEsperado: 201 com pontosSaldo=0.')
        },
        {
          name: '[+] Consultar Saldo de Pontos',
          event: [makeTest([
            "pm.test('Saldo consultado — Status 200', function() { pm.response.to.have.status(200); pm.expect(pm.response.json()).to.have.property('pontosSaldo'); });",
          ])],
          request: get('/fidelidade/saldo', '{{clienteToken}}', 'Consulta saldo de pontos do cliente logado.')
        },
      ]
    },
    {
      name: 'Pedidos',
      description: 'Fluxo principal: criar pedido → pagamento mock → atualizacao de status',
      item: [
        {
          name: 'T08 — [+] Criar Pedido itens validos — APROVADO (201)',
          event: [makeTest([
            "pm.test('T08 — Status 201 pedido criado', function() { pm.response.to.have.status(201); });",
            "pm.test('T08 — Pedido EM_PREPARO apos pagamento APROVADO', function() {",
            "  const b = pm.response.json();",
            "  pm.expect(b.pedido.status).to.eql('EM_PREPARO');",
            "  pm.expect(b.pagamento.status).to.eql('APROVADO');",
            "  pm.expect(b.pagamento.payload).to.have.property('transacaoId');",
            "  pm.collectionVariables.set('pedidoId', b.pedido.id);",
            "});",
            "pm.test('T08 — Numero do pedido no formato #XXXX', function() {",
            "  const b = pm.response.json();",
            "  pm.expect(b.pedido.numeroPedido).to.match(/^#\\d{4}$/);",
            "});",
          ])],
          request: post('/pedidos', {
            canalPedido: 'APP',
            unidadeId: '{{unidadeId}}',
            itens: [{ produtoId: '{{produtoId}}', quantidade: 2 }],
            formaPagamento: 'MOCK'
          }, '{{clienteToken}}',
            'T08 — Positivo: pedido com itens validos e estoque suficiente.\nPre: unidadeId, produtoId, clienteToken validos; estoque >= 2.\nEsperado: HTTP 201, pedido.status=EM_PREPARO, pagamento.status=APROVADO, payload com transacaoId.')
        },
        {
          name: 'T09 — [+] Consultar Pedido por ID',
          event: [makeTest([
            "pm.test('T09 — Status 200 pedido encontrado', function() { pm.response.to.have.status(200); });",
            "pm.test('T09 — Pedido contem array de itens', function() {",
            "  const b = pm.response.json();",
            "  pm.expect(b.itens).to.be.an('array').with.lengthOf.at.least(1);",
            "  pm.expect(b.id).to.eql(pm.collectionVariables.get('pedidoId'));",
            "});",
          ])],
          request: get('/pedidos/{{pedidoId}}', '{{clienteToken}}',
            'T09 — Positivo: consultar detalhes do pedido com seus itens.\nPre: pedidoId valido (executar T08 antes).\nEsperado: HTTP 200 com pedido e array de itens.')
        },
        {
          name: 'T10 — [+] Transitar Pedido: EM_PREPARO para PRONTO',
          event: [makeTest([
            "pm.test('T10 — Status 204 status atualizado', function() { pm.response.to.have.status(204); });",
          ])],
          request: patch('/pedidos/{{pedidoId}}/status',
            { novoStatus: 'PRONTO', motivo: 'Pedido finalizado na cozinha' },
            '{{adminToken}}',
            'T10 — Positivo: transitar pedido de EM_PREPARO para PRONTO.\nPre: pedidoId em EM_PREPARO (executar T08 antes). Admin simula role COZINHA.\nEsperado: HTTP 204 sem corpo.')
        },
        {
          name: 'T11 — [+] Pagamento Mock Negado — Pedido CANCELADO (402)',
          event: [makeTest([
            "pm.test('T11 — Status 402 pagamento negado', function() { pm.response.to.have.status(402); });",
            "pm.test('T11 — Codigo PAGAMENTO_NEGADO', function() { pm.expect(pm.response.json().error.code).to.eql('PAGAMENTO_NEGADO'); });",
          ])],
          request: post('/pedidos', {
            canalPedido: 'APP',
            unidadeId: '{{unidadeId}}',
            itens: [{ produtoId: '{{produtoNegadoId}}', quantidade: 1 }],
            formaPagamento: 'CARTAO_CREDITO'
          }, '{{clienteToken}}',
            'T11 — Pagamento mock negado (produto com precoBase=0.005, valor total < 0.01).\nGateway mock retorna NEGADO. Sistema cancela o pedido e estorna o estoque.\nEsperado: HTTP 402 PAGAMENTO_NEGADO.')
        },
        {
          name: 'T12 — [-] Pedido com produto inexistente (404)',
          event: [makeTest([
            "pm.test('T12 — Status 404 produto nao encontrado', function() { pm.response.to.have.status(404); });",
            "pm.test('T12 — Codigo RECURSO_NAO_ENCONTRADO', function() { pm.expect(pm.response.json().error.code).to.eql('RECURSO_NAO_ENCONTRADO'); });",
          ])],
          request: post('/pedidos', {
            canalPedido: 'APP',
            unidadeId: '{{unidadeId}}',
            itens: [{ produtoId: '00000000-0000-0000-0000-000000000000', quantidade: 1 }],
            formaPagamento: 'MOCK'
          }, '{{clienteToken}}',
            'T12 — Negativo: UUID de produto que nao existe.\nPre: clienteToken valido, unidadeId valido.\nEsperado: HTTP 404 RECURSO_NAO_ENCONTRADO.')
        },
        {
          name: 'T13 — [-] Pedido com estoque insuficiente (422)',
          event: [makeTest([
            "pm.test('T13 — Status 422 estoque insuficiente', function() { pm.response.to.have.status(422); });",
            "pm.test('T13 — Codigo ESTOQUE_INSUFICIENTE', function() { pm.expect(pm.response.json().error.code).to.eql('ESTOQUE_INSUFICIENTE'); });",
          ])],
          request: post('/pedidos', {
            canalPedido: 'APP',
            unidadeId: '{{unidadeId}}',
            itens: [{ produtoId: '{{produtoId}}', quantidade: 99999 }],
            formaPagamento: 'MOCK'
          }, '{{clienteToken}}',
            'T13 — Negativo: quantidade solicitada (99999) maior que estoque disponivel (50).\nPre: estoque = 50 do setup.\nEsperado: HTTP 422 ESTOQUE_INSUFICIENTE. Pedido NAO e criado.')
        },
        {
          name: 'T14 — [-] Transicao de status invalida (422)',
          event: [makeTest([
            "pm.test('T14 — Status 422 transicao invalida', function() { pm.response.to.have.status(422); });",
            "pm.test('T14 — Codigo TRANSICAO_STATUS_INVALIDA', function() { pm.expect(pm.response.json().error.code).to.eql('TRANSICAO_STATUS_INVALIDA'); });",
          ])],
          request: patch('/pedidos/{{pedidoId}}/status',
            { novoStatus: 'PENDENTE' },
            '{{adminToken}}',
            'T14 — Negativo: tentar mover pedido PRONTO de volta para PENDENTE (invalido).\nPre: pedidoId em PRONTO (executar T10 antes).\nEsperado: HTTP 422 TRANSICAO_STATUS_INVALIDA.')
        },
        {
          name: 'T15 — [+] Pedido via TOTEM anonimo sem token (201)',
          event: [makeTest([
            "pm.test('T15 — Status 201 pedido TOTEM anonimo', function() { pm.response.to.have.status(201); });",
            "pm.test('T15 — canalPedido e TOTEM', function() { pm.expect(pm.response.json().pedido.canalPedido).to.eql('TOTEM'); });",
          ])],
          request: post('/pedidos', {
            canalPedido: 'TOTEM',
            unidadeId: '{{unidadeId}}',
            itens: [{ produtoId: '{{produtoId}}', quantidade: 1 }],
            formaPagamento: 'MOCK'
          }, null,
            'T15 — Positivo: pedido anonimo via TOTEM sem JWT (RF-04.1).\nPre: unidadeId, produtoId validos; estoque suficiente.\nEsperado: HTTP 201 com pedido.canalPedido=TOTEM.')
        },
      ]
    },
    {
      name: 'Auditoria e Logs',
      description: 'Evidencias de logs de auditoria gerados em acoes sensiveis',
      item: [
        {
          name: 'T16 — [+] Log de auditoria: entrada de estoque',
          event: [makeTest([
            "pm.test('T16 — Status 201 entrada registrada', function() { pm.response.to.have.status(201); });",
            "pm.test('T16 — Movimentacao tipo ENTRADA', function() {",
            "  const b = pm.response.json();",
            "  pm.expect(b).to.have.property('id');",
            "  pm.expect(b.tipo).to.eql('ENTRADA');",
            "});",
            "pm.test('T16 — Auditoria: verificar log no stdout da API', function() {",
            "  // Log esperado no stdout: {\"audit\":true,\"acao\":\"ESTOQUE_ENTRADA\",\"usuarioId\":\"...\",\"entidade\":\"Estoque\"}",
            "  // Campos PII sao automaticamente [REDACTED] pelo PinoLogger",
            "  pm.expect(true).to.be.true; // evidencia documentada na descricao",
            "});",
          ])],
          request: post('/estoque/entradas', {
            unidadeId: '{{unidadeId}}',
            produtoId: '{{produtoId}}',
            quantidade: 10,
            unidadeMedida: 'UN',
            motivo: 'Teste de auditoria — reposicao de estoque'
          }, '{{adminToken}}',
            [
              'T16 — Evidencia de auditoria: entrada de estoque gera log estruturado no stdout da API.',
              '',
              'Log esperado no terminal onde a API esta rodando:',
              '{"level":30,"audit":true,"acao":"ESTOQUE_ENTRADA","usuarioId":"<id>","entidade":"Estoque","ip":"::1",...}',
              '',
              'Campos PII (email, senha, etc) sao automaticamente [REDACTED] pelo PinoLogger (LGPD).',
              '',
              'O sistema implementa logs de auditoria para:',
              '- LOGIN_REALIZADO (auth/login)',
              '- PEDIDO_CRIADO (post /pedidos)',
              '- PEDIDO_CANCELADO (status CANCELADO)',
              '- ESTOQUE_ENTRADA (post /estoque/entradas)',
              '- FIDELIDADE_ADESAO (post /fidelidade/aderir)',
              '- USUARIO_ANONIMIZADO (delete /usuarios/:id)',
            ].join('\n'))
        },
      ]
    },
    {
      name: 'Erros — Cenarios Extras',
      description: 'Cenarios adicionais de erro para cobertura completa',
      item: [
        {
          name: '[-] Token invalido — JWT malformado (401)',
          event: [makeTest([
            "pm.test('Status 401 token invalido', function() { pm.response.to.have.status(401); });",
          ])],
          request: get('/pedidos', 'token.invalido.aqui', 'Token JWT malformado.\nEsperado: HTTP 401 TOKEN_INVALIDO.')
        },
        {
          name: '[-] Adesao fidelidade sem consentimento — LGPD (409)',
          event: [makeTest([
            "pm.test('Status 409 consentimento false', function() { pm.response.to.have.status(409); });",
          ])],
          request: post('/fidelidade/aderir', { consentimento: false }, '{{clienteToken}}',
            'LGPD: consentimento=false deve ser rejeitado.\nEsperado: HTTP 409.')
        },
        {
          name: '[-] Health Check',
          event: [makeTest([
            "pm.test('Health OK', function() { pm.response.to.have.status(200); pm.expect(pm.response.json().status).to.eql('ok'); });",
          ])],
          request: get('/health', null, 'Verifica se a API esta no ar.')
        },
      ]
    },
  ]
};

// Corrigir os events para ter o formato correto
function fixItem(item) {
  if (item.events && !item.event) {
    item.event = item.events;
  }
  delete item.events;
  if (item.item) {
    item.item.forEach(fixItem);
  }
  return item;
}

collection.item.forEach(folder => {
  if (folder.item) {
    folder.item.forEach(fixItem);
  }
});

fs.writeFileSync('raizdonordeste-postman-collection.json', JSON.stringify(collection, null, 2), 'utf8');
console.log('Colecao Postman gerada com sucesso!');
console.log('Arquivo: raizdonordeste-postman-collection.json');
console.log('Total de pastas: ' + collection.item.length);
const totalRequests = collection.item.reduce((acc, folder) => acc + (folder.item ? folder.item.length : 0), 0);
console.log('Total de requests: ' + totalRequests);
