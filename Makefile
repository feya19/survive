COMPOSE_FILE := api/docker-compose.yml
COMPOSE ?= docker compose -f $(COMPOSE_FILE)

.PHONY: help build build-laravel build-fastapi deploy up down status logs

help:
	@echo "make build         Build Laravel and FastAPI deployment images"
	@echo "make build-laravel Build the Laravel web image"
	@echo "make build-fastapi Build FastAPI, migration, and worker images"
	@echo "make deploy        Build all images and start the stack"
	@echo "make up            Start the stack without rebuilding"
	@echo "make down          Stop the stack (keeps persistent volumes)"
	@echo "make status        Show container status"
	@echo "make logs          Follow container logs"

build:
	$(COMPOSE) build web fastapi-api migrate celery-worker

build-laravel:
	$(COMPOSE) build web

build-fastapi:
	$(COMPOSE) build fastapi-api migrate celery-worker

deploy: build
	$(COMPOSE) up -d --no-build

up:
	$(COMPOSE) up -d --no-build

down:
	$(COMPOSE) down

status:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100