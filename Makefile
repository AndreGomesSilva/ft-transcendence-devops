up:
	@echo "Starting services in detached mode..."
	docker-compose up -d --build

down:
	@echo "Stopping services... "
	docker-compose down

restart:
	@echo "Restarting services..."
	docker-compose restart

run:
	@echo "Starting the Example Service..."
	@if command -v xdg-open > /dev/null; then \
				xdg-open http://localhost:3000; \
			elif command -v open > /dev/null; then \
				open http://localhost:3000; \
			else \
				echo "Could not detect browser opener. Please manually open the URLs above."; \
			fi

clean:
	@echo "Removing all Docker resources..."
	docker-compose down -v --rmi all
	docker system prune -af
	docker volume prune -f

metrics:
	@echo "Opening monitoring dashboards..."
	@if command -v xdg-open > /dev/null; then \
			xdg-open http://localhost:3001; \
		elif command -v open > /dev/null; then \
			open http://localhost:3001; \
		else \
			echo "Could not detect browser opener. Please manually open the URLs above."; \
		fi

help:
	@echo "Commands:"
	@echo "make up          - Start all services"
	@echo "make down        - Stop services"
	@echo "make clean       - Full cleanup"
	@echo "make metrics     - Open monitoring dashboards"

.PHONY: up down restart logs clean metrics
