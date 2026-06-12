.PHONY: up down logs shell ps

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

shell:
	docker compose exec php bash

ps:
	docker compose ps
