.PHONY: install build dev core replica docker-up docker-down

install:
	npm install

build:
	npm run build

core:
	npm run dev:core

replica:
	npm run dev:replica

dev:
	@echo "Run core in one terminal: make core"
	@echo "Run replica in another: CORE_URL=http://localhost:8080 PORT=8091 REPLICA_ID=r1 make replica"

docker-up:
	docker compose up --build --scale replica=3

docker-down:
	docker compose down -v

