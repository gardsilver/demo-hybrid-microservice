.PHONY: default
default: help

.PHONY: help
help: ## Показать список доступных команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: docker-init
init: ## Создать Docker volumes (postgres, redis, kafka, rabbitmq)
	docker volume create --name=postgres
	docker volume create --name=redis
	docker volume create --name=kafka
	docker volume create --name=rabbitmq

.PHONY: logs docker-rm all
dc-rm-all: ## Остановить все контейнеры и очистить Docker (volumes, images)
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml down
	sudo docker system prune
	sudo docker system prune --volumes
	sudo docker system prune -a

.PHONY: docker-compose-down all
dc-down: ## Остановить все контейнеры
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml down

.PHONY: docker-compose-up all
dc-start: ## Запустить все контейнеры
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml up -d

.PHONY: docker-compose-down postgres
dc-down-postgres: ## Остановить PostgreSQL
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml stop postgresdb

.PHONY: docker-compose-down redis
dc-down-redis: ## Остановить Redis
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml stop redis

.PHONY: docker-compose-down kafka
dc-down-kafka: ## Остановить Kafka
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml stop kafka

.PHONY: docker-compose-down rabbitmq
dc-down-rabbitmq: ## Остановить RabbitMQ
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml stop rabbitmq

.PHONY: docker-compose-down demo-hybrid-microservice
dc-down-dhms: ## Остановить demo-hybrid-microservice
	docker compose -f base-compose.yml -f demo-hybrid-microservice.yml stop demo-hybrid-microservice

.PHONY: logs demo-hybrid-microservice
dc-logs-dhms: ## Показать логи demo-hybrid-microservice (последние 50 строк)
	docker logs --tail 50 -f demo-hybrid-microservice
