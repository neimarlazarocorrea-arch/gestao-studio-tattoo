# Tattoo Gestao Pro

Sistema de gestao para estudio de tatuagem (Node.js + Express + SQLite + frontend estatico).

## Requisitos

- Node.js 18+
- npm

## Setup rapido

```bash
npm install
npm start
```

Aplicacao:
- Painel: `http://localhost:3000/`
- Agenda: `http://localhost:3000/agenda`

## Variaveis de ambiente

Use o arquivo `.env.example` como referencia.

Variaveis suportadas:
- `PORT`: porta HTTP (padrao `3000`)
- `CORS_ORIGIN`: lista de origens permitidas, separadas por virgula. Ex.: `http://localhost:3000,http://127.0.0.1:3000`
- `AUTH_ENABLED`: habilita autenticacao Basic nas rotas `/api/*` (`true`/`false`)
- `AUTH_USERS`: usuarios no formato `usuario:senha:perfil`, separados por virgula

Exemplo de `AUTH_USERS`:
- `admin:senha123:admin,operador:senha456:operator`

## Autenticacao opcional (frontend)

Quando `AUTH_ENABLED=true`:
- O frontend exibe `Entrar API` / `Sair API` no painel e na agenda.
- O login usa modal com validacao no servidor antes de salvar credenciais.
- Se uma chamada API retornar `401`, o frontend pode solicitar login e refazer a requisicao uma vez.

## Scripts uteis

```bash
npm run smoke:e2e      # regressao E2E principal
npm run backup-db      # backup do SQLite em backups/
npm run restore-db -- backups/arquivo.db
npm run reset-db       # reset de banco (cuidado)
```

## Contrato de API

Rotas em `/api/*` seguem envelope padrao:
- sucesso: `{ "ok": true, "data": ... }`
- erro: `{ "ok": false, "error": "..." }`

## Observacoes de repositorio

- `node_modules/` e `db/*.db` sao ignorados no git.
- O schema fica em `db/schema.sql`.
- Fluxos criticos devem ser validados com `npm run smoke:e2e`.
