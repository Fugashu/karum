.ONESHELL:
SHELL := /bin/bash
all: help

############################################################################
# PROJECT CONFIG
PROJECT_NAME := karum
CONTAINER_NAME := backend
IMAGE_REGISTRY := registry.fugashu.dev
IMAGE_NAME := $(PROJECT_NAME)/$(CONTAINER_NAME)
RELEASE_DATE := $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
RELEASE_DATE_TAG := $(shell date -u +'%Y-%m-%dT%H-%M-%SZ')

############################################################################
# APP
dev: ## run dev server with auto-reload
	uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

run: ## run production server
	uv run uvicorn src.main:app --host 0.0.0.0 --port 8000

fetch-nodes: ## fetch all solar system data from API (takes ~30min)
	uv run python -c "import asyncio; from src.graph import fetch_and_save_nodes; asyncio.run(fetch_and_save_nodes())"

############################################################################
# TEST
test: ## run tests
	uv run pytest tests/ -v

test-coverage: ## run tests with coverage
	uv run pytest tests/ -v --cov=src --cov-report=term-missing

############################################################################
# DOCKER
UNAME := $(shell uname -s)
ifeq ($(UNAME),Darwin)
	DOCKER := docker-buildx
else
	DOCKER := docker buildx
endif

docker: docker-build docker-push ## build and push the docker image

docker-push: ## push the docker container
	docker image push $(IMAGE_REGISTRY)/$(IMAGE_NAME):latest \
		&& docker image push $(IMAGE_REGISTRY)/$(IMAGE_NAME):$(RELEASE_DATE_TAG)

docker-build: ## build the docker image, extra args with DOCKER_ARGS=...
	$(DOCKER) \
		build \
		$${DOCKER_ARGS} \
		--platform linux/amd64 \
		--build-arg BUILD_DATE=$(RELEASE_DATE) \
		-t $(IMAGE_NAME):$(RELEASE_DATE_TAG) \
		-t $(IMAGE_NAME):latest \
		-t $(IMAGE_REGISTRY)/$(IMAGE_NAME):$(RELEASE_DATE_TAG) \
		-t $(IMAGE_REGISTRY)/$(IMAGE_NAME):latest \
		.

docker-build-macos: ## build native ARM64 image for macOS
	$(DOCKER) \
		build \
		--platform linux/arm64 \
		--build-arg BUILD_DATE=$(RELEASE_DATE) \
		-t $(IMAGE_NAME):macos \
		.

clean: ## clean build artifacts
	rm -rf __pycache__ .pytest_cache .coverage

############################################################################
# HELP
help: ## print this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}'
