.PHONY: help up down build logs logs-backend logs-frontend migrate migrate-create shell-backend shell-frontend test lint format

# Default target
help:
	@echo "Tennis League - Available commands:"
	@echo ""
	@echo "  Docker Commands:"
	@echo "    make up              - Start all containers"
	@echo "    make down            - Stop all containers"
	@echo "    make build           - Build all containers"
	@echo "    make logs            - View logs from all containers"
	@echo "    make logs-backend    - View backend logs"
	@echo "    make logs-frontend   - View frontend logs"
	@echo ""
	@echo "  Database Commands:"
	@echo "    make migrate         - Run database migrations"
	@echo "    make migrate-create  - Create new migration (NAME=migration_name)"
	@echo ""
	@echo "  Development Commands:"
	@echo "    make shell-backend   - Open bash in backend container"
	@echo "    make shell-frontend  - Open bash in frontend container"
	@echo "    make test            - Run backend tests"
	@echo "    make lint            - Run linters"
	@echo "    make format          - Format code"
	@echo ""
	@echo "  Local Development:"
	@echo "    make backend-dev     - Run backend locally (requires poetry)"
	@echo "    make frontend-dev    - Run frontend locally (requires npm)"
	@echo "    make db              - Start only database container"

# Docker commands
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f db

# Database
db:
	docker compose up -d db

migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	docker compose exec backend alembic revision --autogenerate -m "$(NAME)"

# Shell access
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

# Testing
test:
	docker compose exec backend pytest tests/ -v

test-cov:
	docker compose exec backend pytest tests/ -v --cov=app --cov-report=term-missing

# Linting and formatting
lint:
	docker compose exec backend ruff check app/
	docker compose exec backend mypy app/

format:
	docker compose exec backend black app/
	docker compose exec backend isort app/

# Local development (without Docker)
backend-dev:
	cd backend && poetry install && poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend-dev:
	cd frontend && npm install && npm run dev

# Initial setup
setup:
	cp backend/.env.example backend/.env
	cp frontend/.env.example frontend/.env
	docker compose build
	docker compose up -d db
	@echo "Waiting for database to be ready..."
	sleep 5
	docker compose up -d backend
	sleep 3
	docker compose exec backend alembic upgrade head
	docker compose up -d frontend
	@echo ""
	@echo "Setup complete! Access:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/api/v1/docs"

# Clean up
clean:
	docker compose down -v
	rm -rf backend/__pycache__ backend/.pytest_cache
	rm -rf frontend/.next frontend/node_modules

# Production build
prod-build:
	docker compose -f docker-compose.prod.yml build

prod-up:
	docker compose -f docker-compose.prod.yml up -d
