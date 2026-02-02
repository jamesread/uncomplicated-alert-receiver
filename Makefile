default:
	$(MAKE) -wC service

frontend:
	$(MAKE) -wC frontend

container:
	docker stop uar || true
	docker rm uar || true
	docker build -t ghcr.io/jamesread/uncomplicated-alert-receiver .

devcontainer: container
	docker run -d --name uar -p 8080:8080 ghcr.io/jamesread/uncomplicated-alert-receiver

testdata:
	curl http://localhost:8080/alerts --json @var/testing-data.json


.PHONY: default frontend container devcontainer testdata
