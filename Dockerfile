FROM registry.fedoraproject.org/fedora-minimal:40

LABEL org.opencontainers.image.source https://github.com/jamesread/uncomplicated-alert-receiver
LABEL org.opencontainers.image.authors James Read
LABEL org.opencontainers.image.title uncomplicated-alert-receiver

ENV PORT=8080
EXPOSE 8080
RUN mkdir /app
WORKDIR /app

COPY uar /app/uar
COPY webui /app/webui

ENTRYPOINT ["/app/uar"]
