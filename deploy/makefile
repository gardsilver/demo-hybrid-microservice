.PHONY: default
default: help

DC := docker compose -f base-compose.yml -f demo-hybrid-microservice.yml

# Директория для PID- и log-файла фонового watch. Заодно используется как XDG_RUNTIME_DIR
# (в WSL без systemd `/run/user/$UID` не существует — compose watch там падает при попытке
# взять exclusive-lock).
WATCH_DIR := /tmp/docker-compose-$(shell id -u)
WATCH_PID := $(WATCH_DIR)/dhms-watch.pid
WATCH_LOG := $(WATCH_DIR)/dhms-watch.log

.PHONY: help
help: ## Показать список доступных команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: logs docker-rm all
dc-rm-all: _watch-stop ## Остановить все контейнеры и очистить Docker (volumes, images)
	$(DC) down
	sudo docker system prune
	sudo docker system prune --volumes
	sudo docker system prune -a

.PHONY: docker-compose-down all
dc-down: _watch-stop ## Остановить все контейнеры и фоновый watch
	$(DC) down

.PHONY: docker-compose-up all
dc-start: _watch-stop ## Поднять контейнеры и запустить file-sync (Docker Compose Watch) в фоне
	$(DC) up -d
	@$(MAKE) --no-print-directory _watch-start

.PHONY: docker-compose-watch
dc-watch: ## Перезапустить фоновый file-sync (лог — в $(WATCH_LOG))
	@$(MAKE) --no-print-directory _watch-start

.PHONY: docker-compose-watch-log
dc-watch-log: ## Показать лог фонового watch (follow)
	@test -f $(WATCH_LOG) || (echo "watch не запущен (нет $(WATCH_LOG))"; exit 1)
	tail -f $(WATCH_LOG)

.PHONY: _watch-start
_watch-start:
	@mkdir -p $(WATCH_DIR) && chmod 700 $(WATCH_DIR)
	@if [ -f $(WATCH_PID) ] && kill -0 $$(cat $(WATCH_PID)) 2>/dev/null; then \
	   echo "watch уже запущен (PID $$(cat $(WATCH_PID))), перезапускаю"; \
	   kill $$(cat $(WATCH_PID)) 2>/dev/null || true; \
	   sleep 1; \
	 fi
	@XDG_RUNTIME_DIR=$(WATCH_DIR) nohup $(DC) watch > $(WATCH_LOG) 2>&1 < /dev/null & \
	 echo $$! > $(WATCH_PID); \
	 sleep 1; \
	 if kill -0 $$(cat $(WATCH_PID)) 2>/dev/null; then \
	   echo "watch запущен в фоне (PID $$(cat $(WATCH_PID))); лог: $(WATCH_LOG)"; \
	 else \
	   echo "watch не смог стартовать, см. $(WATCH_LOG)"; \
	   tail -20 $(WATCH_LOG) 2>/dev/null || true; \
	   rm -f $(WATCH_PID); \
	   exit 1; \
	 fi

.PHONY: _watch-stop
_watch-stop:
	@if [ -f $(WATCH_PID) ]; then \
	   if kill -0 $$(cat $(WATCH_PID)) 2>/dev/null; then \
	     echo "останавливаю watch (PID $$(cat $(WATCH_PID)))"; \
	     kill $$(cat $(WATCH_PID)) 2>/dev/null || true; \
	   fi; \
	   rm -f $(WATCH_PID); \
	 fi

.PHONY: docker-compose-down postgres
dc-down-postgres: ## Остановить PostgreSQL
	$(DC) stop postgresdb

.PHONY: docker-compose-down redis
dc-down-redis: ## Остановить Redis
	$(DC) stop redis

.PHONY: docker-compose-down kafka
dc-down-kafka: ## Остановить Kafka
	$(DC) stop kafka

.PHONY: docker-compose-down rabbitmq
dc-down-rabbitmq: ## Остановить RabbitMQ
	$(DC) stop rabbitmq

.PHONY: docker-compose-down demo-hybrid-microservice
dc-down-dhms: ## Остановить demo-hybrid-microservice
	$(DC) stop demo-hybrid-microservice

.PHONY: logs demo-hybrid-microservice
dc-logs-dhms: ## Показать логи demo-hybrid-microservice (последние 50 строк)
	docker logs --tail 50 -f demo-hybrid-microservice
