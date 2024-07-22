default:
	go build -o uar github.com/upsilonproject/upsilon-alert-receiver/cmd/upsilon-alert-receiver

container:
	docker stop uar || true
	docker rm uar || true
	docker build -t ghcr.io/upsilonproject/upsilon-alert-receiver .

devcontainer: container
	docker run -d --name uar -p 8080:8080 ghcr.io/upsilonproject/upsilon-alert-receiver

codestyle:
	go fmt ./...
	go vet ./...
	gocritic check ./...
	gocyclo -over 4 cmd
