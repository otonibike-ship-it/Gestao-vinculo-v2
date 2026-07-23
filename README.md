# Gestão de Vínculo

Sistema de gestão de vínculos entre pessoas e empresas.

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 24+
- [VS Code](https://code.visualstudio.com/) + extensão [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- Git

---

## Subindo o ambiente em um comando

```bash
# 1. Clone o repositório
git clone https://github.com/sua-org/gestao-vinculo.git
cd gestao-vinculo

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com os valores necessários

# 3. Suba tudo
docker compose up
```

Pronto. Os serviços estarão disponíveis em:

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Adminer (DB) | http://localhost:8080 |

> Para abrir o Adminer: `docker compose --profile tools up`

---

## Estrutura do projeto

```
gestao-vinculo/
├── .devcontainer/          # Configuração VS Code Dev Container
│   └── devcontainer.json
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # Pipeline CI/CD
├── frontend/               # React / Next.js
│   ├── Dockerfile
│   └── src/
├── backend/                # API principal (FastAPI / Node)
│   ├── Dockerfile
│   ├── app/
│   └── requirements.txt
├── docker/
│   └── postgres/
│       └── init.sql        # Script de inicialização do banco
├── docker-compose.yml      # Ambiente de desenvolvimento
├── docker-compose.prod.yml # Ambiente de produção
├── .env.example            # Modelo de variáveis de ambiente
└── README.md
```

---

## Abrindo no VS Code com Dev Container

1. Abra o VS Code
2. `Ctrl+Shift+P` → **Dev Containers: Open Folder in Container**
3. Selecione a pasta do projeto
4. Aguarde o container construir (primeira vez demora ~2 min)
5. O ambiente estará configurado com todas as extensões e settings da equipe

---

## Fluxo de desenvolvimento (GitHub Flow)

```
main          ←── PRs aprovados, deploy automático em staging
  └── develop ←── integração contínua
        └── feature/nome-da-tarefa  ←── seu trabalho
```

```bash
# Criando uma feature
git checkout develop
git pull origin develop
git checkout -b feature/nome-da-tarefa

# Trabalhando...
git add .
git commit -m "feat: descrição da mudança"
git push origin feature/nome-da-tarefa

# Abra um PR no GitHub apontando para develop
```

### Convenção de commits

```
feat:     nova funcionalidade
fix:      correção de bug
docs:     documentação
style:    formatação (sem mudança de lógica)
refactor: refatoração sem nova feature ou fix
test:     adição ou correção de testes
chore:    tarefas de build, CI, deps
```

---

## Comandos úteis

```bash
# Subir apenas serviços específicos
docker compose up frontend api postgres

# Ver logs em tempo real
docker compose logs -f api

# Rodar migrations
docker compose exec api alembic upgrade head

# Acessar o banco de dados
docker compose exec postgres psql -U vinculo_user -d vinculo_db

# Rodar testes (backend)
docker compose exec api pytest -v

# Rodar testes (frontend)
docker compose exec frontend npm run test

# Parar e remover containers + volumes (reset completo)
docker compose down -v
```

---

## Secrets necessários no GitHub

Configure em **Settings → Secrets and variables → Actions**:

| Secret | Descrição |
|---|---|
| `STAGING_HOST` | IP ou hostname do servidor de staging |
| `STAGING_USER` | Usuário SSH do servidor |
| `STAGING_SSH_KEY` | Chave SSH privada para deploy |
| `SLACK_WEBHOOK_URL` | Webhook para notificações (opcional) |

---

## Dúvidas?

Abra uma issue ou fale no canal `#gestao-vinculo` no Slack.
