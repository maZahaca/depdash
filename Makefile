.PHONY: help install dev build start db-up db-down db-reset db-studio db-migrate db-seed clean

help: ## Show this help message
	@echo "DepDash - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Start development server
	npm run dev

build: ## Build for production
	npm run build

start: ## Start production server
	npm start

# Database commands
db-up: ## Start PostgreSQL with Docker
	docker-compose up -d
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 3
	@docker-compose exec postgres pg_isready -U postgres

db-down: ## Stop PostgreSQL
	docker-compose down

db-logs: ## View PostgreSQL logs
	docker-compose logs -f postgres

db-reset: ## Reset database (WARNING: deletes all data)
	npx prisma migrate reset --force

db-studio: ## Open Prisma Studio
	npx prisma studio

db-migrate: ## Create and apply migration
	npx prisma migrate dev

db-seed: ## Seed database with test data
	npx prisma db seed

db-push: ## Push schema changes without migration
	npx prisma db push

db-generate: ## Generate Prisma Client
	npx prisma generate

# Setup commands
setup: install db-up db-generate db-migrate db-seed ## Complete setup for new developers
	@echo ""
	@echo "✅ Setup complete! Run 'make dev' to start development server"

clean: ## Clean all data and dependencies
	docker-compose down -v
	rm -rf node_modules
	rm -rf .next
	rm -rf data
	@echo "✅ Cleaned successfully"

restart: db-down db-up ## Restart PostgreSQL

psql: ## Connect to database with psql
	docker exec -it depdash-postgres psql -U postgres -d depdash

# Utility commands
lint: ## Run linter
	npm run lint

type-check: ## Run TypeScript type checking
	npx tsc --noEmit

test: ## Run tests
	npm test