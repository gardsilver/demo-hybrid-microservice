.PHONY: default
default:
	echo "test-project"

.PHONY: install
i:
	npm i

.PHONY: proto-compile
proto-compile:
	npm run proto-compile

.PHONY: proto-compile-win
proto-compile-win:
	npm run proto-compile-win

.PHONY: start
start:
	npm run start

.PHONY: start-dev
start-dev:
	npm run start:dev

.PHONY: rebuild
rebuild:
	rmdir /s /q .\dist
	rmdir /s /q .\node_modules
	npm i
	npm run proto-compile

.PHONY: rebuild-win
rebuild-win:
	rmdir /s /q .\dist
	rmdir /s /q .\node_modules
	npm i
	npm run proto-compile-win

.PHONY: lint
lint:
	npm run format
	git diff --name-only --diff-filter=AM original/master > .eslint-list
	npm run lint:diff

.PHONY: lint-all
lint-all:
	npm run format
	npm run lint:all

.PHONY: test
test:
	npm run test

.PHONY: test-cov
test-cov:
	npm run test:cov

.PHONY: test-e2e
test-e2e:
	npm run test:e2e
