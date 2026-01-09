# Tennis League SaaS

Sistema multi-tenant para gerenciamento de ligas de tenis amadoras.

## Funcionalidades

- **Multi-tenant**: Cada escola/clube tem seu proprio ambiente isolado
- **Gestao de Jogadores**: Cadastro e perfil de jogadores
- **Ligas e Rankings**: Sistema ELO ou por pontos
- **Partidas**: Registro com confirmacao dupla
- **Torneios**: Chaves eliminatorias automaticas
- **Agendamento**: Sistema de propostas de horarios

## Stack Tecnologica

### Backend
- FastAPI (Python 3.11+)
- SQLAlchemy + Alembic
- PostgreSQL
- JWT Authentication

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query

### Infraestrutura
- Docker + Docker Compose
- Railway (deploy)

## Requisitos

- Docker e Docker Compose
- Make (opcional, mas recomendado)

## Inicio Rapido

### 1. Clone o repositorio

```bash
git clone <repo-url>
cd tenis_league
```

### 2. Configure o ambiente

```bash
# Copie os arquivos de exemplo
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Inicie os containers

```bash
# Com Make
make up

# Ou diretamente com Docker
docker compose up -d
```

### 4. Execute as migracoes

```bash
# Com Make
make migrate

# Ou diretamente
docker compose exec backend alembic upgrade head
```

### 5. Acesse

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/v1/docs

## Comandos Uteis

```bash
# Ver todos os comandos disponiveis
make help

# Iniciar containers
make up

# Parar containers
make down

# Ver logs
make logs
make logs-backend
make logs-frontend

# Executar migracoes
make migrate

# Criar nova migracao
make migrate-create NAME="descricao_da_migracao"

# Rodar testes
make test

# Acessar shell do container
make shell-backend
make shell-frontend
```

## Estrutura do Projeto

```
tenis_league/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # Endpoints da API
│   │   ├── core/              # Configuracoes e seguranca
│   │   ├── models/            # Modelos SQLAlchemy
│   │   ├── schemas/           # Schemas Pydantic
│   │   ├── services/          # Logica de negocio
│   │   └── main.py
│   ├── alembic/               # Migracoes
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/               # Paginas Next.js
│   │   ├── components/        # Componentes React
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilitarios e API client
│   │   └── types/             # TypeScript types
│   └── package.json
├── docker-compose.yml
├── Makefile
└── README.md
```

## Sistema de Ranking

### ELO
- Rating inicial: 1500 pontos
- Formula: `Novo Rating = Rating Atual + K × (Resultado - Expectativa)`
- Fator K: 32
- Considera margem de vitoria

### Pontos
- Vitoria: +3 pontos
- Derrota: +1 ponto
- WO dado: 0 pontos
- WO recebido: +3 pontos

## Deploy no Railway

1. Crie um projeto no Railway
2. Adicione um servico PostgreSQL
3. Conecte seu repositorio GitHub
4. Configure as variaveis de ambiente:

```
# Backend
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=<gere-uma-chave-segura>
CORS_ORIGINS=https://seu-frontend.railway.app

# Frontend
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

## API Endpoints

### Autenticacao
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Usuario atual

### Tenants
- `POST /api/v1/tenants/` - Criar organizacao
- `GET /api/v1/tenants/current` - Organizacao atual

### Jogadores
- `GET /api/v1/players/` - Listar jogadores
- `POST /api/v1/players/` - Criar jogador
- `GET /api/v1/players/{id}` - Detalhes do jogador

### Ligas
- `GET /api/v1/leagues/` - Listar ligas
- `POST /api/v1/leagues/` - Criar liga
- `POST /api/v1/leagues/{id}/players` - Adicionar jogador

### Partidas
- `GET /api/v1/matches/` - Listar partidas
- `POST /api/v1/matches/` - Registrar partida
- `POST /api/v1/matches/{id}/confirm` - Confirmar resultado

### Rankings
- `GET /api/v1/rankings/league/{id}` - Ranking da liga
- `GET /api/v1/rankings/head-to-head` - Confronto direto

### Torneios
- `GET /api/v1/tournaments/` - Listar torneios
- `POST /api/v1/tournaments/` - Criar torneio
- `POST /api/v1/tournaments/{id}/generate-bracket` - Gerar chaves

### Agendamento
- `GET /api/v1/schedules/` - Listar agendamentos
- `POST /api/v1/schedules/` - Propor horario
- `POST /api/v1/schedules/{id}/respond` - Responder proposta

## Licenca

MIT
