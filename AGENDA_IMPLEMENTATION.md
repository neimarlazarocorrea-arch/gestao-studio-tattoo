# Modulo Agenda - Implementacao

## Visao geral

Este documento descreve o modulo Agenda por blocos funcionais.
Cada bloco explica o que foi implementado, onde esta no codigo e como validar.

## Bloco 1: Base de dados

Objetivo:
- guardar agendamentos com dados de cliente, data, hora, servico, preco e estado.

Implementacao:
- tabela `appointments` em `db/schema.sql`;
- indices para consultas mais frequentes (por data, estado e relacoes).

## Bloco 2: Servico (regra de negocio)

Objetivo:
- centralizar as regras da Agenda fora do controlador.

Implementacao:
- `services/appointmentService.js` com:
  - listagem com filtros;
  - CRUD completo;
  - proximos dias (`upcoming`);
  - contagem de hoje (`countToday`);
  - conclusao de sessao e ligacao a fluxo financeiro/OS quando aplicavel.

## Bloco 3: Controlador (camada HTTP)

Objetivo:
- validar pedidos e devolver respostas no contrato da API.

Implementacao:
- `controllers/appointmentController.js`:
  - valida campos obrigatorios;
  - chama o servico;
  - devolve sucesso/erro no formato esperado.

## Bloco 4: Rotas

Objetivo:
- expor endpoints da Agenda com ordem correta de rotas.

Implementacao:
- `routes/appointments.js`:
  - rotas nomeadas primeiro (`upcoming`, `today-count`);
  - rotas por id depois (`:id`).

## Bloco 5: Integracao no servidor

Objetivo:
- servir a pagina da Agenda e manter API ativa.

Implementacao:
- registo de rotas no servidor;
- endpoint/pagina `GET /agenda` para abrir `public/agenda.html`.

## Bloco 6: Interface da Agenda

Objetivo:
- permitir operacao diaria sem sair da pagina.

Implementacao:
- `public/agenda.html` com formulario, tabela e filtros;
- `public/js/agenda.js` com:
  - carregar clientes e orcamentos;
  - criar, editar, eliminar e concluir agendamentos;
  - atualizar tabela por filtros (hoje, proximos dias, todos);
  - sincronizar estado com autenticacao da API.

## Bloco 7: Ligacao ao painel/resumo

Objetivo:
- refletir informacao da Agenda no dashboard principal.

Implementacao:
- `services/summaryService.js` calcula indicadores da agenda;
- `controllers/summaryController.js` devolve dados para o painel;
- `public/index.html` apresenta os indicadores.

## Bloco 8: Contrato de API

Objetivo:
- padronizar respostas para facilitar interface e testes.

Formato:
- sucesso: `{ ok: true, data: ... }`
- erro: `{ ok: false, error: "..." }`

## Bloco 9: Testes de validacao

Testes manuais sugeridos:
1. criar agendamento valido;
2. listar proximos 7 dias;
3. contar agendamentos de hoje;
4. editar e concluir agendamento;
5. eliminar agendamento;
6. confirmar resposta correta para erros de validacao.

Teste automatizado:
- `npm run smoke:e2e` (inclui fluxo da Agenda no conjunto de regressao).

## Bloco 10: Endpoints da Agenda

- `GET /api/appointments`
- `POST /api/appointments`
- `GET /api/appointments/:id`
- `PUT /api/appointments/:id`
- `DELETE /api/appointments/:id`
- `GET /api/appointments/upcoming?days=7`
- `GET /api/appointments/today-count`
- `GET /agenda`

## Bloco 11: Observacoes operacionais

- datas no formato `YYYY-MM-DD`;
- horas no formato `HH:MM`;
- estado padrao de novo agendamento: `scheduled`;
- manter validacao por smoke test apos alteracoes relevantes.
