# Plan de Migración a OCI (Oracle Cloud Infrastructure) — Pay As You Go

**Sistema:** Intranet Académica ADUNI Vallejo
**Alcance:** Levantar el sistema en OCI (lift-and-shift). Seguridad/automatización completa en fases posteriores.
**Fecha del plan:** 2026-08-18

> Este documento lista las **fases que TÚ debes realizar y preparar**. Las modificaciones ya hechas en el repositorio están descritas al final (sección "Cambios ya aplicados").

---

## Resumen de decisiones tomadas

| Decisión | Elección |
|----------|----------|
| Base de datos | PostgreSQL autogestionado en VM (compatible con Prisma y `pg_dump`) |
| Archivos subidos | Volumen de bloque persistente (sin cambios de código) |
| Región | `sa-santiago-1` (Chile) — la más cercana a Perú. Alternativa: `sa-saopaulo-1` |
| Presupuesto | Cabe en el **Always Free** de OCI (US$0/mes base) |
| Shape recomendado | Ampere A1 (ARM) 2 OCPU / 12 GB RAM, Ubuntu 22.04 |

---

## FASE 0 — Preparación local (en tu PC) ✔️ HECHO (2026-08-19)

1. **BD fuente confirmada**: **PostgreSQL 18 nativo de Windows** (servicio `postgresql-x64-18`, puerto `5432`), base de datos `ACADEMIA_ADUNI_VALLEJO` (~10 MB). No es Docker ni Supabase.
2. **Respaldo de la BD generado** (formato custom, compatible con `pg_restore`):
   ```
   C:\Users\LEGION\AppData\Local\Temp\opencode\migracion_oci\respaldo_pre_migracion.dump
   ```
   ⚠️ **Cópiame a un pendrive o servicio externo** antes de continuar.
3. **Archivos subidos copiados** (course-covers, courses, profile-pictures; ~16.7 MB) en:
   ```
   C:\Users\LEGION\AppData\Local\Temp\opencode\migracion_oci\uploads
   ```
   Se restaurarán en la VM OCI en `/data/runtime/uploads`.
4. **Guardar los valores actuales** de `backend/.env` y `backend/.env.production` en un lugar seguro (solo referencia; NO reutilizar las claves).
5. **Repositorio GitHub creado** (privado): `https://github.com/MAOC27COAM/AdVaSys`
   - Rama `main`, ya pusheada, `.env`/uploads/runtime excluidos.
   - Para clonar el repo privado en la VM OCI necesitas un **deploy key SSH** (recomendado, read-only) o un **PAT** con permiso de lectura. Ver Fase 3.

---

## FASE 1 — Crear la tenancy y recursos base en OCI 🖥️ TU TAREA

1. Crear cuenta **Oracle Cloud** con plan **Pay As You Go** (piden tarjeta pero el free tier no factura hasta superarlo).
2. Elegir región **Chile (Santiago)** `sa-santiago-1` al crear la tenancy.
3. Crear un **Compartimento** llamado `intranet-vallejo`.
4. Crear una **VCN** con:
   - Subred pública.
   - Internet Gateway.
   - **Security List / NSG** que abra solo:
     - `22/tcp` (SSH, restringido a tu IP)
     - `8080/tcp` (la app web)
5. Generar un **par de llaves SSH** (`.pem`) y guardar la clave privada.

---

## FASE 2 — Crear la VM y el volumen de bloque 💻 TU TAREA

1. Crear **Instancia** (Compute → Instances):
   - Imagen: **Ubuntu 22.04**
   - Shape: **VM.Standard.A1.Flex** (Ampere) → 2 OCPU / 12 GB RAM
   - Subred pública + IP pública (reserva una IP o usa la efímera).
   - Pegar la clave pública SSH.
2. Crear y adjuntar un **Block Volume de 100 GB** (`/dev/sdb` aprox.).
3. Conectarse por SSH:
   ```bash
   ssh -i tu-clave.pem ubuntu@IP_PUBLICA
   ```
4. Formatear y montar el volumen en `/data`:
   ```bash
   sudo mkfs.ext4 /dev/sdb
   sudo mkdir -p /data
   sudo mount /dev/sdb /data
   # Persistir el montaje:
   echo '/dev/sdb /data ext4 defaults 0 0' | sudo tee -a /etc/fstab
   ```
5. **Firewall UFW** (cerrar todo menos 22 y 8080):
   ```bash
   sudo apt update && sudo apt install -y ufw
   sudo ufw allow OpenSSH
   sudo ufw allow 8080/tcp
   sudo ufw enable
   ```

---

## FASE 3 — Instalar Docker y subir el proyecto 🐳 TU TAREA

1. Instalar Docker en la VM:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # cerrar sesión y volver a entrar para que aplique
   ```
2. Clonar el proyecto (repo privado):
   ```bash
   cd /data
   git clone git@github.com:MAOC27COAM/AdVaSys.git
   cd AdVaSys
   ```
   > Si usas HTTPS con PAT:
   > ```bash
   > git clone https://<USUARIO>:<PAT>@github.com/MAOC27COAM/AdVaSys.git
   > ```
3. Dar permiso de ejecución al script de despliegue:
   ```bash
   chmod +x deploy/install-or-update.sh
   ```
   > El repositorio fuerza saltos de línea LF en los `.sh` (ver `.gitattributes`), así que no deberían aparecer errores de "bad interpreter".

---

## FASE 4 — Configurar secretos nuevos en la VM 🔐 TU TAREA

En la VM, editar `/data/AdVaSys/deploy/.env` (se crea desde la plantilla al ejecutar el script por primera vez):

```env
COMPOSE_PROJECT_NAME=intranet_vallejo_oci
APP_PORT=8080
POSTGRES_DB=intranet_db
POSTGRES_USER=intranet
POSTGRES_PASSWORD=<CLAVE_NUEVA_FUERTE>
JWT_SECRET=<SECRETO_NUEVO_LARGO>
JWT_EXPIRES_IN=4h
CORS_ORIGINS=http://IP_PUBLICA:8080,http://localhost:8080
RUNTIME_DIR=/data/runtime
```

Generar secretos con:
```bash
openssl rand -hex 32   # para POSTGRES_PASSWORD
openssl rand -hex 64   # para JWT_SECRET
```

> **NUNCA reutilices** el `JWT_SECRET` ni las claves que estaban en los `.env` commiteados.

---

## FASE 5 — Migrar los datos 📦 TU TAREA

1. **Subir el dump y los uploads a la VM** (desde tu PC):
   ```bash
   scp -i tu-clave.pem "C:\Users\LEGION\AppData\Local\Temp\opencode\migracion_oci\respaldo_pre_migracion.dump" ubuntu@IP:/data/
   scp -r -i tu-clave.pem "C:\Users\LEGION\AppData\Local\Temp\opencode\migracion_oci\uploads" ubuntu@IP:/data/runtime/uploads
   ```
2. **Levantar SOLO la BD** para restaurar:
   ```bash
   cd /data/AdVaSys/deploy
   RUNTIME_DIR=/data/runtime docker compose --env-file .env -f docker-compose.beta.yml up -d db
   ```
3. **Restaurar el dump** (formato custom `-Fc`, se usa `pg_restore`):
   ```bash
   docker compose --env-file .env -f docker-compose.beta.yml exec -T db \
     pg_restore -U intranet -d intranet_db --no-owner --role=intranet \
     < /data/respaldo_pre_migracion.dump
   ```
   > La BD de OCI usa **PostgreSQL 18** (`postgres:18-alpine`, misma versión que tu PC), por lo que no hay conflictos de versión. Si el dump no existiera en `/data`, cámbialo por la ruta real.
4. **Restaurar los uploads** (verificar estructura final):
   ```
   /data/runtime/uploads/
     ├── course-covers/
     ├── courses/
     └── profile-pictures/
   ```
4. **Verificar conteos** (dentro de la BD):
   ```bash
   docker compose --env-file .env -f docker-compose.beta.yml exec db psql -U intranet -d intranet_db -c \
     "SELECT (SELECT count(*) FROM \"User\") AS usuarios, (SELECT count(*) FROM \"CycleEnrollment\") AS matriculas, (SELECT count(*) FROM \"PaymentAgreement\") AS pagos;"
   ```
   Comparar contra la BD origen.

---

## FASE 6 — Levantar el sistema 🚀 TU TAREA

1. Ejecutar el script (construye imágenes, corre migraciones Prisma y seed automáticamente):
   ```bash
   cd /data/AdVaSys/deploy
   ./install-or-update.sh
   ```
2. Abrir en el navegador:
   ```
   http://IP_PUBLICA:8080
   ```
3. Verificar el healthcheck:
   ```
   http://IP_PUBLICA:8080/api/health
   ```

---

## FASE 7 — Validación y go-live ✅ TU TAREA

### Smoke test (mínimo obligatorio)
- [ ] Login con administrador y con estudiante
- [ ] Matrícula de estudiante (nuevo y recurrente)
- [ ] Registrar un pago y un descuento
- [ ] Sesión de asistencia + escaneo QR
- [ ] Subir y descargar un material de curso
- [ ] Simulacro: crear evento → analizar RAW → procesar → ver resultados
- [ ] Generar un carnet
- [ ] Exportar e importar backup (botón de respaldo)

### Seguridad inmediata (NO OPCAIONAL)
- [ ] **Cambiar las contraseñas por defecto** de `kami`, `Admin_1`, `Matri_1`, `Matri_2` (el seed las crea). Se puede prevenir en despliegues futuros definiendo `SEED_PASSWORD_*` en el `.env`.
- [ ] Confirmar que `UFW` está activo (solo 22 y 8080).
- [ ] Guardar el `.env` de la VM fuera del servidor (respaldo cifrado).

---

## FASE 8 — Documentar y asegurar continuidad 📄 TU TAREA

- [ ] Documentar el procedimiento de **restauración** (dump + uploads) y probarlo una vez.
- [ ] Programar respaldos periódicos de la BD y uploads (pendiente fase posterior, pero puedes empezar con un cron simple):
  ```bash
  # En la VM (cron)
  0 2 * * * cd /data/AdVaSys/deploy && docker compose --env-file .env -f docker-compose.beta.yml exec -T db pg_dump -U intranet -d intranet_db > /data/backups/backup_$(date +\%F).sql
  ```
- [ ] Dejar constancia de la IP pública, región y credenciales en un gestor de contraseñas.

---

## Fases posteriores (recomendadas después del go-live)

| Fase | Descripción | Prioridad |
|------|-------------|-----------|
| **P1** | **TLS + dominio**: Load Balancer OCI con certificado (gratis) o Cloudflare Tunnel. Sin HTTPS, las contraseñas viajan en texto plano. | **ALTA** |
| **P2** | OCI Vault para gestionar secretos. | Media |
| **P3** | Backups automáticos a **Object Storage** + retención + prueba mensual de restauración. | Media |
| **P4** | CI/CD (GitHub Actions o OCI DevOps): build + deploy automático. | Media |
| **P5** | Monitoreo: OCI Logging + Notifications (alarmas de disco/RAM/CPU). | Media |
| **P6** | Migrar uploads a Object Storage cuando crezca el volumen. | Baja |
| **P7** | Separar BD y app en 2 VMs cuando se necesite más estabilidad. | Baja |

---

## Cambios ya aplicados en el repositorio

1. **`.gitignore` raíz** — excluye secretos (`.env*`), `node_modules`, `deploy/runtime`, `backend/uploads`, `backend/tmp`, backups y archivos de depuración.
2. **`backend/.env.example`** y **`frontend/.env.example`** — plantillas sin secretos.
3. **`deploy/.env.example`** — nueva variable `RUNTIME_DIR` (para el volumen de bloque de OCI).
4. **`deploy/docker-compose.beta.yml`** — los volúmenes ahora usan `${RUNTIME_DIR:-./runtime}` (funciona igual en local y en OCI con `/data/runtime`).
5. **`deploy/install-or-update.sh`** — script de despliegue para Linux/Ubuntu (equivalente al `.ps1`), listo para la VM de OCI.
6. **`backend/prisma/seed.js`** — contraseñas por defecto configurables vía `SEED_PASSWORD_KAMI` / `SEED_PASSWORD_ADMIN` / `SEED_PASSWORD_MATRICULADOR`, con advertencia en consola si se usan las por defecto.
7. **`backend/src/app.js`** — **rate-limit global** (600 solicitudes / 15 min por IP) además del límite de login ya existente.
8. **Eliminado `backend/test_env.js`** — imprimía `DATABASE_URL` en consola (riesgo de fuga de credenciales).
9. **Repositorio unificado creado y pusheado** — `https://github.com/MAOC27COAM/AdVaSys` (privado, rama `main`). Se aplanaron los `.git` internos de `backend/` y `frontend/`; la landing `WEB/` se excluyó (mantiene su propio repo).
10. **`.gitattributes`** — fuerza LF en `*.sh` (evita "bad interpreter" en la VM Ubuntu), CRLF en `*.ps1`/`*.bat`, y marca los binarios como `binary`.
11. **`deploy/docker-compose.beta.yml`** — imagen de BD cambiada a **`postgres:18-alpine`** para coincidir con el PostgreSQL 18 local y que el `pg_dump` restaure sin conflictos de versión.
12. **`README.md`** — completado con stack, estructura, despliegue local y enlaces al plan OCI.