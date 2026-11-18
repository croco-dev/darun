#!/usr/bin/env bash
set -euo pipefail

# The caller supplies the disposable CI PostgreSQL service. Each suite owns an
# empty database and uses its own PostgREST schema cache and loopback port.
postgres=${1:?Pass the disposable PostgreSQL service container ID}
postgres_name=$(docker inspect --format '{{.Name}}' "$postgres")
postgres_network=$(docker inspect --format '{{if eq (len .NetworkSettings.Networks) 1}}{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}{{end}}' "$postgres")
postgres_port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$postgres")
test -n "$postgres_network"
test -n "$postgres_port"

fixture_dir=$(mktemp -d)
cleanup() {
  local status=$? cidfile
  for cidfile in "$fixture_dir"/*; do
    [[ -s $cidfile ]] || continue
    docker rm --force "$(cat "$cidfile")" >/dev/null || status=1
  done
  rm -r "$fixture_dir" || status=1
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

start_fixture() {
  local prefix=$1 database=$2 container port api attempt
  docker exec "$postgres" psql -U sync -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $database"
  container=$(docker run --detach --cidfile "$fixture_dir/$database" --network "$postgres_network" \
    --publish 127.0.0.1::3000 \
    --env "PGRST_DB_URI=postgresql://sync:sync@${postgres_name#/}:5432/$database" \
    --env PGRST_DB_ANON_ROLE=sync \
    postgrest/postgrest:v14.18@sha256:c7cd7e265a85b05248abf53f4473fcec7e327c282d0bd0cf60f1551996d09fcf)
  port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}' "$container")
  api="http://127.0.0.1:$port"
  for ((attempt = 1; attempt <= 25; attempt++)); do
    if curl --fail --silent --max-time 1 --noproxy '*' --output /dev/null "$api/"; then
      export "${prefix}_TEST_DATABASE_URL=postgresql://sync:sync@127.0.0.1:$postgres_port/$database"
      export "${prefix}_TEST_POSTGREST_URL=$api"
      return
    fi
    sleep 1
  done
  echo "PostgREST fixture for $database did not become ready" >&2
  docker logs "$container" >&2
  return 1
}

start_fixture APP_SEARCH darun_app_search
start_fixture MEMO darun_memo_integrity
start_fixture PROFILE darun_profile_integrity

REQUIRED_POSTGRES_GROUP=tier-postgrest pnpm --filter tier-web exec vitest run \
  src/app/apps/app-search.pg.test.ts \
  src/app/admin/app-memo.pg.test.ts \
  src/utils/ensure-user-profile.pg.test.ts \
  --reporter=default --reporter="$PWD/apps/graphql-api/scripts/required-postgres-reporter.ts"
