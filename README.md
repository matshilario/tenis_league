# Liga de Tênis

App da liga do nosso grupo de tênis: classificação, resultados, mata-mata e painel da
organização, seguindo o [regulamento](frontend/src/content/regulamento.md).

- **Backend:** FastAPI + SQLAlchemy (async) + PostgreSQL — `backend/`
- **Frontend:** Next.js 14 + Tailwind + React Query — `frontend/`
- **Avisos:** WhatsApp do grupo via serviço `agents-notify`

## Como funciona

| Regra | Onde |
|---|---|
| Placar (2 sets, tie-break, super tie-break), pontuação 10/3/1, W.O., abandono | `backend/app/domain/scoring.py` |
| Desempate (6 critérios, confronto direto só entre dois) | `backend/app/domain/standings.py` |
| Grupos (1 ou 2), serpentina, todos contra todos, semis, folgas | `backend/app/domain/draw.py` |
| Contestação 48h, retirada (§9), 2 W.O., homologação, chave | `backend/app/services/league.py` |
| Textos dos avisos do grupo | `backend/app/services/messages.py` |

A classificação é sempre recalculada a partir das partidas — editar, anular ou retirar
jogadores nunca deixa a tabela inconsistente.

**Fluxo:** admin gera convite → pessoa se cadastra → admin aprova (e inscreve na
categoria) → admin ordena níveis e sorteia → jogadores lançam placar, adversário confirma
ou contesta em 48h → admin resolve contestações, W.O., interrupções → homologa → semis →
final → campeão.

## Visual (Duvis Cup)

- **Ideia:** a página é a quadra do adversário; a faixa no rodapé é o nosso lado, com a
  borda de cima servindo de rede. O tenista troca bolas que passam por cima da rede e, de
  vez em quando, um macaco-prego entra para roubar a bola ou a garrafa d'água.
- **Quadra:** `frontend/src/components/court/` — `sprites.ts` (pixel art em grades),
  `engine.ts` (cenário, física, desenho), `scenes.ts` (banco de cenas). Para criar uma
  cena, escreva um gerador e registre em `SCENES`. `?macaco` na URL acelera as aparições;
  `?macaco=monkey-ball` força uma cena específica.
- **Tipografia:** Fraunces (títulos e números grandes), Public Sans (interface e
  tabelas, com números tabulares) e Silkscreen (detalhes em pixel, só textos curtos).
- **Cores:** creme, verde-quadra, oliva, lima da bola, azul-marinho e terra batida
  (`globals.css`), com versão "sessão noturna" no modo escuro.
- **Origem dos recursos:** logo e ícone do app derivados da arte fornecida pela
  organização (`public/brand/`); sprites desenhados à mão no código; ícones Solar via
  Iconify (CC BY 4.0, embutidos por `npm run icons`); fontes Google Fonts (OFL).

## Rodando local

```bash
# backend (sem Docker: SQLite)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
export DATABASE_URL=sqlite+aiosqlite:///./dev.db
.venv/bin/alembic upgrade head
.venv/bin/python -m app.cli create-admin voce@email.com "Seu Nome"
.venv/bin/uvicorn app.main:app --reload            # http://localhost:8000/api/v1/docs

# frontend
cd frontend && npm install && npm run dev          # http://localhost:3000
```

Com Docker: `docker compose up -d` e depois
`docker compose exec backend python -m app.cli create-admin voce@email.com "Seu Nome"`.

Testes: `cd backend && .venv/bin/pytest`.

## Variáveis (backend)

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Postgres (aceita o `postgres://` da Railway) |
| `SECRET_KEY` | chave dos tokens — gere uma longa e aleatória |
| `CORS_ORIGINS`, `FRONTEND_URL` | URL do frontend (CORS e links de convite) |
| `NOTIFY_URL`, `NOTIFY_TOKEN`, `NOTIFY_TARGET` | avisos no WhatsApp; `NOTIFY_TARGET` = JID do grupo (`…@g.us`). Vazio = só log |

Frontend: `NEXT_PUBLIC_API_URL` (URL pública do backend, definida no build).

## Deploy (Railway)

Dois serviços apontando para este repo — `backend/` e `frontend/` como *root directory* —
mais um Postgres. O backend roda as migrações ao subir. O JID do grupo precisa estar em
`ALLOWED_NUMBERS` do serviço notify.
