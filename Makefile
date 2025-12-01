.PHONY: help install dev build test lint clean docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make install     - Install all dependencies"
	@echo "  make dev         - Start all services in development mode"
	@echo "  make build       - Build all services"
	@echo "  make test        - Run all tests"
	@echo "  make lint        - Lint all code"
	@echo "  make docker-up   - Start Docker containers"
	@echo "  make docker-down - Stop Docker containers"
	@echo "  make clean       - Clean build artifacts"

install:
	npm install
	npm run install:all

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

clean:
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf apps/*/dist
	rm -rf apps/*/build
	rm -rf apps/*/.next



