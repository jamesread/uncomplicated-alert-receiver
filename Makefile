default:
	go build -o uar github.com/uncomplicatedproject/uncomplicated-alert-receiver/cmd/uncomplicated-alert-receiver

container:
	docker stop uar || true
	docker rm uar || true
	docker build -t ghcr.io/jamesread/uncomplicated-alert-receiver .

devcontainer: container
	docker run -d --name uar -p 8080:8080 ghcr.io/uncomplicatedproject/uncomplicated-alert-receiver

codestyle:
	go fmt ./...
	go vet ./...
	gocritic check ./...
	gocyclo -over 3 cmd
