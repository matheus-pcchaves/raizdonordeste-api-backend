# Contribuindo com o raizdonordeste-api-backend

Este documento cobre o fluxo de trabalho, convenções de código, testes e arquitetura. Para setup do ambiente local, ver o [README](README.md).

> Code review é aprendizado, não julgamento. Perguntas no PR fazem parte do processo — faça e responda com naturalidade.

---

## Testes

- Deverá ser aplicada a metodologia TDD (Test-Driven Development), ou seja, escrever os testes antes de escrever o código.
- Todos os testes devem passar antes de abrir um PR.
- Todos os testes devem ser executados com o comando `npm run test`.

### Filosofia

- Fakes em vez de mocks — testar o comportamento real da porta, não as chamadas
- Nome de teste descreve o comportamento: `test_ticket_cannot_close_without_resolution`
- Pirâmide: muitos testes de domínio e use case (sem rede/DB) → alguns de integração → poucos E2E

### Regra antes de abrir PR

Todo use case novo deve ter ao menos 1 teste unitário cobrindo o caminho principal.

---