.PHONY: default
default: help

.PHONY: help
help: ## Показать список доступных команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: install
i: ## Создать .env (если нет) и установить зависимости
	@test -f .env || (cp .example.env .env && echo "Created .env from .example.env")
	npm i

.PHONY: proto-compile
proto-compile: ## Скомпилировать proto-файлы (Linux)
	npm run proto-compile

.PHONY: proto-compile-win
proto-compile-win: ## Скомпилировать proto-файлы (Windows)
	npm run proto-compile-win

.PHONY: start
start: ## Запустить приложение
	npm run start

.PHONY: start-dev
start-dev: ## Запустить приложение в режиме разработки
	npm run start:dev

.PHONY: rebuild
rebuild: ## Полная пересборка проекта (Linux)
	rm -rf ./dist ./node_modules
	npm i
	npm run proto-compile

.PHONY: rebuild-win
rebuild-win: ## Полная пересборка проекта (Windows)
	if exist .\dist rmdir /s /q .\dist
	if exist .\node_modules rmdir /s /q .\node_modules
	npm i
	npm run proto-compile-win

.PHONY: lint
lint: ## Форматирование + линтинг изменённых файлов (относительно master)
	npm run format
	git diff --name-only --diff-filter=AM origin/master > .eslint-list
	npm run lint:diff

.PHONY: lint-all
lint-all: ## Форматирование + линтинг всего кода
	npm run format
	npm run lint:all

.PHONY: test
test: ## Запустить unit-тесты
	npm run test

.PHONY: test-cov
test-cov: ## Запустить unit-тесты с покрытием
	npm run test:cov

.PHONY: test-e2e
test-e2e: ## Запустить e2e-тесты
	npm run test:e2e

.PHONY: dc-start
dc-start: ## Поднять все контейнеры + запустить Docker Compose Watch в фоне
	$(MAKE) -C deploy dc-start

.PHONY: dc-watch
dc-watch: ## Перезапустить фоновый Docker Compose Watch (если упал или нужно обновить)
	$(MAKE) -C deploy dc-watch

.PHONY: dc-down
dc-down: ## Остановить все контейнеры и фоновый watch
	$(MAKE) -C deploy dc-down

.PHONY: dc-logs
dc-logs: ## Показать логи приложения (последние 50 строк, follow)
	$(MAKE) -C deploy dc-logs-dhms

.PHONY: dc-watch-log
dc-watch-log: ## Показать лог фонового file-sync (follow)
	$(MAKE) -C deploy dc-watch-log
