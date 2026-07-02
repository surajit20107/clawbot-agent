#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  exit 1
fi

CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

POSTGRES_URL=$(grep '^POSTGRES_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')
if [ -z "$POSTGRES_URL" ]; then
  echo "Error: POSTGRES_URL not found in $ENV_FILE"
  exit 1
fi

cmd="${1:-help}"

case "$cmd" in
  list)
    psql "$POSTGRES_URL" -c "SELECT id, \"cronExpression\", \"nextRunAt\", \"lastRunAt\", enabled, \"lastError\" FROM \"CronJob\" ORDER BY \"createdAt\" DESC;"
    ;;

  make-due)
    job_id="${2:-}"
    if [ -z "$job_id" ]; then
      echo "Usage: $0 make-due <job-id> [\"<offset>\"]"
      echo "  e.g. $0 make-due 1234... \"5 minutes ago\""
      exit 1
    fi
    offset="${3:-1 minute ago}"
    psql "$POSTGRES_URL" -c "UPDATE \"CronJob\" SET \"nextRunAt\" = NOW() - INTERVAL '$offset' WHERE id = '$job_id' RETURNING id, \"nextRunAt\";"
    ;;

  trigger)
    echo "Triggering $APP_URL/api/cron/tick ..."
    if [ -n "$CRON_SECRET" ]; then
      curl -s -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/tick" | jq . || curl -s -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/tick"
    else
      curl -s "$APP_URL/api/cron/tick" | jq . || curl -s "$APP_URL/api/cron/tick"
    fi
    echo ""
    ;;

  status)
    job_id="${2:-}"
    if [ -z "$job_id" ]; then
      echo "Usage: $0 status <job-id>"
      exit 1
    fi
    psql "$POSTGRES_URL" -c "SELECT * FROM \"CronJob\" WHERE id = '$job_id';"
    ;;

  delete)
    job_id="${2:-}"
    if [ -z "$job_id" ]; then
      echo "Usage: $0 delete <job-id>"
      exit 1
    fi
    psql "$POSTGRES_URL" -c "DELETE FROM \"CronJob\" WHERE id = '$job_id' RETURNING id;"
    ;;

  help|*)
    cat <<EOF
Usage: $0 <command> [args]

Commands:
  list                    List all cron jobs.
  make-due <id> [offset]  Set nextRunAt to now - offset (default: '1 minute ago').
  trigger                 Hit /api/cron/tick (uses CRON_SECRET in prod-like setups).
  status <id>             Show all fields for one job.
  delete <id>             Delete a job from the DB.

Typical local flow:
  1) Ask the agent in chat to schedule a task.
  2) $0 list                  # find the id
  3) $0 make-due <id>         # make it due
  4) $0 trigger               # fire it
  5) $0 status <id>           # confirm lastRunAt advanced
EOF
    ;;
esac
