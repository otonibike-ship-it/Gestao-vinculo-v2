# Guia completo — Gestão de Vínculo
## Do zero ao ambiente rodando no VS Code

---

## O que foi criado (57 arquivos no total)

```
Gestao-de-Vinculo/
│
├── .devcontainer/
│   └── devcontainer.json          ← configuração do VS Code Dev Container
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml              ← pipeline CI/CD automático
│
├── .env.example                   ← modelo de variáveis de ambiente
├── .gitignore
├── Makefile                       ← atalhos de comandos
├── README.md
├── docker-compose.yml             ← orquestra todos os serviços
│
├── docker/
│   └── postgres/
│       └── init.sql               ← script inicial do banco
│
├── backend/                       ← API FastAPI (Python)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 0001_criacao_inicial.py
│   └── app/
│       ├── main.py                ← entrada da API
│       ├── seed.py                ← dados de teste
│       ├── core/
│       │   ├── config.py          ← configurações/variáveis
│       │   └── database.py        ← conexão com PostgreSQL
│       ├── models/
│       │   ├── vinculo.py
│       │   ├── pessoa.py
│       │   └── usuario.py
│       ├── schemas/
│       │   ├── vinculo.py
│       │   └── auth.py
│       ├── services/
│       │   ├── vinculo_service.py
│       │   └── auth_service.py
│       └── api/v1/
│           ├── router.py
│           └── endpoints/
│               ├── vinculo.py
│               ├── auth.py
│               └── pessoas.py
│
└── frontend/                      ← Interface Next.js (React)
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   ├── (auth)/login/page.tsx
        │   └── (dashboard)/
        │       ├── layout.tsx
        │       ├── dashboard/page.tsx
        │       ├── vinculos/page.tsx
        │       ├── vinculos/novo/page.tsx
        │       ├── pessoas/page.tsx
        │       └── empresas/page.tsx
        ├── components/
        │   ├── providers.tsx
        │   └── layout/
        │       ├── sidebar.tsx
        │       └── header.tsx
        ├── lib/
        │   └── api.ts             ← cliente HTTP (axios)
        └── services/
            ├── auth.ts
            └── vinculo.ts
```

---

## Passo a passo para subir o projeto

### Pré-requisitos
- [ ] Docker Desktop instalado e **rodando** (ícone na bandeja do sistema)
- [ ] VS Code instalado
- [ ] Git instalado

---

### Etapa 1 — Baixar e colocar os arquivos no repositório

1. Baixe o arquivo `gestao-vinculo-completo.zip`
2. Extraia o ZIP
3. Copie **todo o conteúdo** extraído para dentro da pasta do seu projeto
   (`Gestao-de-Vinculo` que já está no VS Code)
4. A estrutura de pastas deve ficar igual ao diagrama acima

> ⚠️ Atenção: arquivos que começam com `.` (como `.env.example`, `.gitignore`,
> `.devcontainer`) são arquivos ocultos. No Windows, ative "mostrar itens ocultos"
> no Explorer para vê-los após extrair.

---

### Etapa 2 — Configurar o arquivo .env

No terminal do VS Code (`Ctrl + '`):

```bash
# Criar o .env a partir do modelo
cp .env.example .env
```

Abra o `.env` e altere apenas esta linha — gere uma chave segura:

```
JWT_SECRET=cole_aqui_uma_string_longa_e_aleatoria
```

Dica para gerar uma chave no terminal:
```bash
# No terminal PowerShell (Windows):
[System.Web.Security.Membership]::GeneratePassword(32,0)

# Ou simplesmente use qualquer texto longo como:
JWT_SECRET=minha-chave-super-secreta-gestao-vinculo-2025
```

---

### Etapa 3 — Subir o ambiente completo

No terminal do VS Code, dentro da pasta do projeto:

```bash
# Opção A — Comando único que faz tudo automaticamente:
make setup
```

O que esse comando faz na ordem:
1. Constrói as imagens Docker (backend e frontend)
2. Sobe todos os containers (API, frontend, PostgreSQL, Redis)
3. Roda as migrations (cria as tabelas no banco)
4. Popula o banco com dados de teste (seed)

Aguarde até aparecer no terminal:
```
✅ Ambiente pronto!
   Frontend: http://localhost:3000
   API:      http://localhost:8000/docs
   Login:    admin@vinculo.com / admin123
```

> ⚠️ Na primeira vez demora mais (5-10 min) porque baixa as imagens base do Docker.
> Da segunda vez em diante é bem mais rápido.

---

### Etapa 4 — Verificar se está funcionando

Abra no navegador:

| O que testar | URL |
|---|---|
| Frontend (tela de login) | http://localhost:3000 |
| API (documentação Swagger) | http://localhost:8000/docs |
| Banco de dados (visual) | `make shell-db` no terminal |

Login de teste:
- **E-mail:** admin@vinculo.com
- **Senha:** admin123

---

### Etapa 5 — Commitar e subir para o GitHub

```bash
git add .
git commit -m "feat: estrutura inicial do projeto"
git push origin main
```

Após o push, vá até o repositório no GitHub → aba **Actions**.
Você verá o pipeline CI/CD rodando automaticamente.

---

## Comandos do dia a dia

| O que fazer | Comando |
|---|---|
| Subir os serviços | `make up` |
| Parar os serviços | `make down` |
| Ver os logs | `make logs` |
| Ver log de um serviço | `make logs-s s=api` |
| Abrir terminal na API | `make shell-api` |
| Rodar os testes | `make test-back` |
| Criar nova migration | `make migration name=nome_da_mudanca` |
| Reset completo | `make reset` (apaga os dados) |

---

## Problemas comuns

**"Cannot connect to Docker daemon"**
→ O Docker Desktop não está rodando. Abra o aplicativo e aguarde o ícone ficar verde.

**"Port 5432 already in use"**
→ Tem um PostgreSQL local rodando na máquina. Pare-o ou mude a porta no `.env`.

**"Exit code 1" no Dev Container**
→ Normal neste momento — o Dev Container não é mais necessário para rodar.
Use `make up` no terminal normal do VS Code.

**A página http://localhost:3000 não abre**
→ Aguarde ~30 segundos após o `make up`. O Next.js demora um pouco para compilar.

---

## Próximos passos (Sprint 2)

Com o ambiente rodando, as próximas tarefas são:
1. Implementar o CRUD completo de Pessoas e Empresas no backend
2. Conectar as telas de Pessoas e Empresas no frontend
3. Adicionar autenticação real (buscar usuário no banco)
4. Implementar histórico de alterações nos vínculos
