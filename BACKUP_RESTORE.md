# Copia de Seguranca e Restauro

## Bloco de copia de seguranca

Comando:

```bash
npm run backup-db
```

Resultado esperado:
- cria um ficheiro em `backups/` com nome no formato `tattoo-YYYYMMDD-HHMMSS.db`;
- preserva um ponto de recuperacao antes de manutencoes mais arriscadas.

## Bloco de restauro

Comando:

```bash
npm run restore-db -- backups/tattoo-YYYYMMDD-HHMMSS.db
```

Comportamento:
- o restauro substitui `db/tattoo.db` pelo ficheiro indicado;
- deve parar o servidor antes do restauro para evitar corrupcao de dados.

## Bloco de auditoria

As acoes criticas ficam registadas em `audit_logs` para rastreabilidade:
- fecho de orcamento;
- mudanca de estado de OS;
- eliminacao de agendamento;
- eliminacao de transacao;
- alteracao/remocao de cliente.

## Bloco de autenticacao opcional

Pode ativar autenticacao por variaveis de ambiente:
- `AUTH_ENABLED=true`
- `AUTH_USERS=admin:senha123:admin,operador:senha456:operator`

Formato de `AUTH_USERS`:
- `utilizador:senha:perfil`
- perfis com permissao de escrita: `admin`, `operator`

Com autenticacao ativa, as rotas `/api/*` exigem cabecalho `Authorization: Basic ...`.
