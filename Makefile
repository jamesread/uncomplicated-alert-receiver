default:
	go build -o uar github.com/jamesread/uncomplicated-alert-receiver/cmd/uncomplicated-alert-receiver

container:
	docker stop uar || true
	docker rm uar || true
	docker buildx create --use --name multi-arch-builder || true
	docker buildx build --platform $(shell uname -m | grep -q "arm64\|aarch64" && echo "linux/arm64" || echo "linux/amd64") -t ghcr.io/jamesread/uncomplicated-alert-receiver --load .

multi-arch:
	docker buildx create --use --name multi-arch-builder || true
	docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/jamesread/uncomplicated-alert-receiver .

devcontainer: container
	docker run -d --name uar -p 8080:8080 ghcr.io/jamesread/uncomplicated-alert-receiver

codestyle:
	go fmt ./...
	go vet ./...
	gocritic check ./...
	gocyclo -over 3 cmd

testdata:
	curl http://localhost:8082/alerts --json @var/testing-data.json
