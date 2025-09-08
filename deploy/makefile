.PHONY: default
default:
	echo "docker compose"


.PHONY: docker-compose-down
dc-down:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml down

.PHONY: demo-hybrid-microservice-up
dc-dhms-up:
	docker-compose -f base-compose.yml -f demo-hybrid-microservice.yml up -d
