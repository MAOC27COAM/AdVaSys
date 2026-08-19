#!/bin/sh
set -eu

mkdir -p /usr/src/app/uploads /usr/src/app/tmp

echo "[backend] Ejecutando migraciones Prisma..."
npx prisma migrate deploy

echo "[backend] Ejecutando seed base..."
npx prisma db seed

echo "[backend] Iniciando servidor..."
exec node src/server.js
