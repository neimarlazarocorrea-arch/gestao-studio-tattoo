# Manual de Instalacao e Uso

## 1. Visao geral

O `tattoo-gestao-pro` e um sistema de gestao para estudio de tatuagem com:
- backend Node.js + Express;
- base de dados SQLite;
- interface web estatica.

Principais modulos:
- clientes;
- orcamentos;
- agenda;
- ordens de servico (OS);
- financeiro, recibos, receitas e lembretes;
- relatorios e resumo gerencial.

## 2. Requisitos

Antes de instalar, garanta que possui:
- Node.js 18 ou superior;
- npm;
- Git (se for clonar o repositorio).

Para validar:

```bash
node -v
npm -v
git --version
```

## 3. Instalacao

### 3.1 Obter o codigo

Se ainda nao tem o projeto local:

```bash
git clone https://github.com/neimarlazarocorrea-arch/gestao-studio-tattoo.git
cd gestao-studio-tattoo
```

Se ja tem a pasta local, entre nela:

```bash
cd c:\DEV\repos\tattoo-gestao-pro
```

### 3.2 Instalar dependencias

```bash
npm install
```

### 3.3 Configurar variaveis de ambiente (opcional, recomendado)

Crie um ficheiro `.env` com base no `.env.example`.

Variaveis principais:
- `PORT`: porta HTTP (padrao `3000`)
- `CORS_ORIGIN`: origens permitidas, separadas por virgula
- `AUTH_ENABLED`: ativa autenticacao Basic em `/api/*`
- `AUTH_USERS`: `utilizador:senha:perfil`, separados por virgula

Exemplo:

```env
PORT=3000
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
AUTH_ENABLED=false
AUTH_USERS=admin:senha123:admin,operador:senha456:operator
```

## 4. Inicializacao da aplicacao

### 4.1 Modo normal

```bash
npm start
```

Acesso:
- Painel: `http://localhost:3000/`
- Agenda: `http://localhost:3000/agenda`

### 4.2 Reiniciar base local (quando necessario)

```bash
npm run reset-db
```

Use apenas quando precisar recriar a base local para desenvolvimento/testes.

## 5. Primeiros passos de uso

## 5.1 Painel

No menu principal, aceda aos modulos:
- `Clientes`
- `Orcamentos`
- `Agenda`
- `Ordens de Servico`
- `Financeiro`
- `Relatorios`

## 5.2 Fluxo operacional recomendado

1. Cadastrar cliente.
2. Criar orcamento.
3. Criar OS a partir do orcamento.
4. Ir para Agenda e criar/agendar sessoes.
5. Atualizar estado da OS (iniciar/concluir).
6. Fechar projeto/orcamento quando a OS estiver concluida.

## 5.3 Autenticacao API (opcional)

Se `AUTH_ENABLED=true`:
- use `Entrar API` no painel/agenda;
- informe credenciais validas de `AUTH_USERS`;
- a interface guarda credenciais no navegador;
- pode usar `Sair API` para remover credenciais locais.

## 6. Scripts uteis

```bash
npm run smoke:e2e
npm run backup-db
npm run restore-db -- backups/ficheiro.db
npm run reset-db
```

Descricao:
- `smoke:e2e`: regressao funcional principal (API + paginas);
- `backup-db`: cria copia da base em `backups/`;
- `restore-db`: restaura copia para `db/tattoo.db`;
- `reset-db`: recria base local de desenvolvimento.

## 7. Backup e restauro

### 7.1 Criar backup

```bash
npm run backup-db
```

### 7.2 Restaurar backup

```bash
npm run restore-db -- backups/tattoo-YYYYMMDD-HHMMSS.db
```

Recomendacao:
- parar o servidor antes do restauro.

## 8. Validacao apos instalacao

Execute o smoke test para confirmar ambiente funcional:

```bash
npm run smoke:e2e
```

Resultado esperado:
- todos os checks aprovados;
- sem falhas no resumo final.

## 9. Problemas comuns

### 9.1 Porta em uso

Sintoma: erro ao iniciar servidor na porta `3000`.

Solucoes:
- fechar processo que usa a porta;
- ou alterar `PORT` no `.env`.

### 9.2 Erro de permissao/autenticacao na API

Sintoma: respostas `401` ou `403` em `/api/*`.

Solucoes:
- confirmar `AUTH_ENABLED`;
- validar formato de `AUTH_USERS`;
- refazer login por `Entrar API`.

### 9.3 Base de dados inconsistente em ambiente local

Solucoes:
- criar backup (se necessario);
- executar `npm run reset-db`;
- revalidar com `npm run smoke:e2e`.

## 10. Estrutura essencial do projeto

- `server.js`: arranque do servidor
- `app.js`: configuracao da aplicacao
- `controllers/`: camada HTTP
- `services/`: regras de negocio e acesso a dados
- `routes/`: mapeamento de endpoints
- `db/`: conexao, schema e inicializacao
- `public/`: interface web estatica
- `scripts/`: automacoes operacionais e testes smoke

## 11. Referencias rapidas

- Guia principal: `README.md`
- Backup/restauro: `BACKUP_RESTORE.md`
- Agenda (detalhes): `AGENDA_IMPLEMENTATION.md`
- Historico de alteracoes: `CHANGELOG.md`
