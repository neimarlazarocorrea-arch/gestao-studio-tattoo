# Tattoo Gestao Pro

Sistema de gestao para estudio de tatuagem com backend Node.js/Express, base de dados SQLite e frontend estatico.

## Objetivo do projeto

Este sistema cobre os blocos operacionais principais de um estudio:
- clientes;
- orcamentos;
- agenda;
- ordens de servico;
- transacoes e recibos;
- relatorios e resumo gerencial.

## Requisitos

- Node.js 18 ou superior
- npm

## Configuracao rapida

```bash
npm install
npm start
```

Entradas principais da aplicacao:
- Painel: `http://localhost:3000/`
- Agenda: `http://localhost:3000/agenda`

## Variaveis de ambiente

Use `.env.example` como referencia.

Variaveis suportadas:
- `PORT`: porta HTTP (padrao `3000`)
- `CORS_ORIGIN`: lista de origens permitidas, separadas por virgula
- `AUTH_ENABLED`: ativa autenticacao Basic nas rotas `/api/*` (`true`/`false`)
- `AUTH_USERS`: utilizadores no formato `utilizador:senha:perfil`, separados por virgula

Exemplo:
- `AUTH_USERS=admin:senha123:admin,operador:senha456:operator`

## Bloco de autenticacao (opcional)

Quando `AUTH_ENABLED=true`:
- o frontend apresenta `Entrar API` e `Sair API` no painel e na agenda;
- o login e feito em modal, com validacao no servidor antes de gravar credenciais;
- quando uma chamada devolve `401`, o frontend pode pedir autenticacao e repetir a requisicao uma unica vez.

## Bloco de scripts operacionais

```bash
npm run smoke:e2e      # regressao E2E principal
npm run backup-db      # copia de seguranca do SQLite em backups/
npm run restore-db -- backups/ficheiro.db
npm run reset-db       # recriacao da base local (usar com cuidado)
```

## Bloco de contrato da API

As rotas em `/api/*` seguem envelope padrao:
- sucesso: `{ "ok": true, "data": ... }`
- erro: `{ "ok": false, "error": "..." }`

Este bloco facilita o tratamento uniforme de respostas no frontend.

## Bloco de repositorio

- `node_modules/` e `db/*.db` estao ignorados no git;
- o esquema principal esta em `db/schema.sql`;
- alteracoes de backend/frontend devem ser validadas com `npm run smoke:e2e`.
