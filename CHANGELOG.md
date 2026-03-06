# Historico de Alteracoes

## 2026-03-06

### Adicionado
- Fluxo operacional de Ordem de Servico (OS) integrado ao ciclo de orcamento e agenda.
- Endpoints de OS e acoes de transicao de status (open, in_progress, completed, cancelled).
- Regras de negocio para fechamento de orcamento bloqueado enquanto OS nao estiver concluida.
- Middleware de contrato para `/api/*` com envelope padrao de resposta.
- Autenticacao opcional por Basic Auth em `/api/*` via variaveis de ambiente.
- Tabela de auditoria (`audit_logs`) e registro de acoes criticas.
- Scripts operacionais de banco (`backup-db`, `restore-db`) e documentacao correspondente.
- Teste smoke E2E ampliado para 23 verificacoes de regressao.
- Documentacao de configuracao/operacao em `README.md` e exemplo de ambiente em `.env.example`.

### Alterado
- Frontend passou a consumir API por utilitario centralizado (`public/js/api.js`) com tratamento de erro uniforme.
- Agenda redesenhada e alinhada visualmente com o painel principal.
- UX de autenticacao aprimorada no frontend:
  - menu/botao Entrar API/Sair API no painel e agenda;
  - modal de login com validacao de credencial no servidor;
  - erro inline no modal com limpeza automatica ao editar campos;
  - sincronizacao global de estado de autenticacao entre telas;
  - repeticao unica apos `401` quando aplicavel.
- KPI de ciclo medio de OS movido para backend e exibido em painel/relatorios.
- Exportacao CSV de resumo gerencial adicionada em relatorios.

### Corrigido
- Navegacao principal restaurada e rotas de paginas estabilizadas (`/` e `/agenda`).
- Consistencia de retorno da API para erros e sucesso em rotas `/api/*`.
- Higiene de repositorio:
  - `node_modules/` removido do indice e ignorado;
  - `db/*.db` e `backups/*.db` ignorados;
  - `.env.example` explicitamente versionado.

### Validacao
- Regressao automatizada executada com sucesso: `npm run smoke:e2e` (`23/23` aprovado).
