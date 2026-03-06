# Backup e Restore

## Backup do banco

Comando:

```bash
npm run backup-db
```

Resultado:
- Cria um arquivo em `backups/` com nome `tattoo-YYYYMMDD-HHMMSS.db`.

## Restore do banco

Comando:

```bash
npm run restore-db -- backups/tattoo-YYYYMMDD-HHMMSS.db
```

Observacoes:
- O restore sobrescreve `db/tattoo.db`.
- Pare o servidor antes de restaurar para evitar corrupcao.

## Auditoria

Acoes criticas sao registradas em `audit_logs`:
- fechamento de orcamento
- troca de status de OS
- exclusao de agendamento
- exclusao de transacao
- update/delete de cliente

## Autenticacao opcional

A autenticacao pode ser habilitada por variaveis de ambiente.

Variaveis:
- `AUTH_ENABLED=true`
- `AUTH_USERS=admin:senha123:admin,operador:senha456:operator`

Formato:
- `usuario:senha:perfil`
- perfis aceitos para escrita: `admin`, `operator`

Com autenticacao ativa, as rotas `/api/*` exigem `Authorization: Basic ...`.
