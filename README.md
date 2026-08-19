# Intranet Académica ADUNI Vallejo

Sistema de gestión académica para la Academia ADUNI Vallejo (Andahuaylas): matrícula por ciclos, pagos y descuentos, asistencia con QR, cursos y materiales, simulacros, calificaciones, horarios y generación de carnets.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 (react-scripts/CRA), Chart.js, html5-qrcode, pdf.js |
| Backend | Node.js 18 + Express 5 + Prisma 6 (PostgreSQL) |
| Base de datos | PostgreSQL (local 18 / contenedor `postgres:18-alpine` en despliegue) |
| Servidor web | Nginx (sirve el frontend compilado y proxea `/api` y `/uploads`) |
| Despliegue | Docker Compose + scripts PowerShell/Bash |

## Estructura

```
backend/    API Express + Prisma (migraciones, seed, uploads)
frontend/   Aplicación React (build compilado servido por nginx)
deploy/     Despliegue con Docker Compose (web + backend + db) y scripts de instalación
docs/       Plan de migración a OCI y modelamiento del sistema
```

## Despliegue local (Windows, un solo paso)

Requisito: Docker Desktop con Compose.

```powershell
.\deploy\install-or-update.ps1
```

- URL principal: `http://localhost:8080`
- API healthcheck: `http://localhost:8080/api/health`
- Datos persistentes en `deploy/runtime/` (BD, uploads, backups).

## Despliegue en OCI (Oracle Cloud Infrastructure, Always Free)

Ver el plan completo en [`docs/PLAN_MIGRACION_OCI.md`](docs/PLAN_MIGRACION_OCI.md) y el procedimiento operativo en [`docs/RUNBOOK_GH_OCI.md`](docs/RUNBOOK_GH_OCI.md).

Resumen:

1. Crear la tenancy (región `sa-santiago-1`), VCN abriendo solo `22` y `8080`.
2. Crear una VM Ampere A1 (Ubuntu 22.04) + Block Volume de 100 GB montado en `/data`.
3. Instalar Docker y clonar este repositorio en `/data`.
4. Configurar `deploy/.env` (secretos nuevos, `RUNTIME_DIR=/data/runtime`).
5. Ejecutar `./deploy/install-or-update.sh`.

## Configuración

- `backend/.env.example` — plantilla de variables del backend (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `SEED_PASSWORD_*`).
- `frontend/.env.example` — plantilla del frontend (`REACT_APP_API_URL`).
- `deploy/.env.example` — plantilla del despliegue (puerto, credenciales de BD, secretos).

**Nunca** subir archivos `.env` a git (ya excluidos en `.gitignore`).

## Respaldos

```powershell
.\deploy\backup-beta.ps1        # Backup de la BD a deploy/runtime/backups
.\deploy\stop-beta.ps1          # Detener el sistema
```