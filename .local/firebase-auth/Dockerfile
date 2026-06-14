FROM andreysenov/firebase-tools:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /firebase

EXPOSE 9099

CMD ["firebase", "emulators:start", "--only", "auth", "--project", "darun-local", "--host", "0.0.0.0"]
