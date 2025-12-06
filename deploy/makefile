.PHONY: default
default:
	echo "docker compose"

.PHONY: docker-init
init:
	docker volume create --name=postgres
	docker volume create --name=redis
	docker volume create --name=kafka

.PHONY: logs docker-rm all
dc-rm-all:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml down
	sudo docker system prune
	sudo docker system prune --volumes
	sudo docker system prune -a

.PHONY: docker-compose-down all
dc-down:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml down

.PHONY: docker-compose-up all
dc-start:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml up -d

.PHONY: docker-compose-down postgres
dc-down-postgres:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml stop postgresdb

.PHONY: docker-compose-down redis
dc-down-redis:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml stop redis

.PHONY: docker-compose-down kafka
dc-down-kafka:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml stop kafka

.PHONY: docker-compose-down demo-hybrid-microservice
dc-down-dhms:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml stop demo-hybrid-microservice

.PHONY: logs demo-hybrid-microservice
dc-logs-dhms:
	docker logs --tail 50 -f demo-hybrid-microservice
