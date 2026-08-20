# Runbook: GitHub + OCI (Oracle Cloud Infrastructure, Always Free)

**Sistema:** Intranet Académica ADUNI Vallejo
**Repositorio:** `https://github.com/MAOC27COAM/AdVaSys` (privado, rama `main`)
**Fecha de preparación:** 2026-08-19

> Guía operativa de despliegue y actualización del sistema en una VM de OCI dentro del plan Always Free. Complementa a [`PLAN_MIGRACION_OCI.md`](PLAN_MIGRACION_OCI.md) (plan de migración completo).

---

## Resumen de la arquitectura objetivo

```
Internet ──> VM OCI (Ubuntu 22.04, Ampere A1)
                ├── Nginx (web)    :8080  → sirve frontend compilado
                │     ├── /api        ──> backend:4000
                │     └── /uploads    ──> backend:4000
                ├── Backend (Node 18 + Prisma) :4000
                └── PostgreSQL 18 (postgres:18-alpine)
Datos persistentes en el Block Volume montado en /data/runtime
```

---

## 1. Preparación local (ya realizada)

- Repositorio unificado creado y pusheado a GitHub (privado).
- Respaldo de la BD local generado (formato custom de `pg_dump`).
- Uploads copiados (course-covers, courses, profile-pictures).
- Deploy key SSH generada para que la VM clone el repo sin exponer una cuenta.

> ⚠️ El respaldo, los uploads y la clave privada deben estar guardados **fuera del repositorio** (pendrive/servicio externo), nunca versionados.

## 2. GitHub: registrar la deploy key (1 vez)

1. Abrir `https://github.com/MAOC27COAM/AdVaSys/settings/keys`.
2. **Add deploy key**:
   - Title: `oci-vm`
   - Key: contenido de `AdVaSys_deploy.pub`
   - Sin marcar **Allow write access** (solo lectura).

> Alternativa: usar un **PAT** de GitHub con permiso de solo lectura en la URL de clonado HTTPS.

## 3. Oracle Cloud: crear la infraestructura (consola OCI)

1. Tenancy **Pay As You Go** en región `sa-santiago-1` (Chile) o `sa-saopaulo-1`.
2. Compartimento `intranet-vallejo`.
3. VCN `intranet-vcn` + subred pública + Internet Gateway.
   - Security List / NSG abriendo **solo**:
     - `22/tcp` (SSH, restringido a tu IP si es posible)
     - `8080/tcp` (la aplicación)
4. VM `intranet-vm`:
   - Imagen **Ubuntu 22.04**
   - Shape **VM.Standard.A1.Flex** (Ampere ARM): 2 OCPU / 12 GB RAM
   - Subred pública con IP pública
   - Pegar la clave pública SSH de OCI (distinta de la deploy key)
5. **Block Volume de 100 GB** adjuntado a la VM.

## 4. Preparar la VM

```bash
ssh -i TU_CLAVE_OCI.pem ubuntu@IP_PUBLICA

# 1. Montar el volumen en /data
sudo mkfs.ext4 /dev/sdb
sudo mkdir -p /data
sudo mount /dev/sdb /data
echo '/dev/sdb /data ext4 defaults 0 0' | sudo tee -a /etc/fstab

# 2. Firewall (cerrar todo menos 22 y 8080)
sudo apt update && sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw enable

# 3. Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para que aplique el grupo docker
```

## 5. Clonar el repositorio (con la deploy key)

```bash
mkdir -p ~/.ssh
# Copiar el contenido de AdVaSys_deploy (clave PRIVADA) a ~/.ssh/id_deploy
chmod 600 ~/.ssh/id_deploy
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_deploy
  IdentitiesOnly yes
EOF

cd /data
git clone git@github.com:MAOC27COAM/AdVaSys.git
cd AdVaSys
chmod +x deploy/install-or-update.sh
```

> Los `.sh` del repositorio usan saltos de línea LF (garantizado por `.gitattributes`), por lo que no aparecerán errores de "bad interpreter".

## 6. Configurar secretos NUEVOS en la VM

```bash
cd /data/AdVaSys/deploy
cp .env.example .env
```

Editar `deploy/.env` (generar valores con `openssl rand -hex 32` / `openssl rand -hex 64`):

```env
COMPOSE_PROJECT_NAME=intranet_vallejo_oci
APP_PORT=8080
POSTGRES_DB=intranet_db
POSTGRES_USER=intranet
POSTGRES_PASSWORD=<CLAVE_NUEVA>
JWT_SECRET=<SECRETO_NUEVO_LARGO>
JWT_EXPIRES_IN=4h
CORS_ORIGINS=http://IP_PUBLICA:8080,http://localhost:8080
RUNTIME_DIR=/data/runtime

# Contraseñas del seed (opcional pero recomendado en producción)
SEED_PASSWORD_KAMI=<NUEVA>
SEED_PASSWORD_ADMIN=<NUEVA>
SEED_PASSWORD_MATRICULADOR=<NUEVA>
```

> **Nunca reutilizar** el `JWT_SECRET` ni las claves que existían en los `.env` locales.

## 7. Migrar los datos

Desde la PC local, subir el dump y los uploads:

```bash
scp -i TU_CLAVE_OCI.pem respaldo_pre_migracion.dump ubuntu@IP_PUBLICA:/data/
scp -r -i TU_CLAVE_OCI.pem uploads ubuntu@IP_PUBLICA:/data/runtime/uploads
```

En la VM, levantar solo la BD y restaurar:

```bash
cd /data/AdVaSys/deploy
RUNTIME_DIR=/data/runtime docker compose --env-file .env -f docker-compose.beta.yml up -d db

docker compose --env-file .env -f docker-compose.beta.yml exec -T db \
  pg_restore -U intranet -d intranet_db --no-owner --role=intranet < /data/respaldo_pre_migracion.dump
```

Verificar estructura de uploads y conteos de datos:

```bash
ls -R /data/runtime/uploads

docker compose --env-file .env -f docker-compose.beta.yml exec db psql -U intranet -d intranet_db -c \
  "SELECT (SELECT count(*) FROM \"User\") AS usuarios, (SELECT count(*) FROM \"CycleEnrollment\") AS matriculas, (SELECT count(*) FROM \"PaymentAgreement\") AS pagos;"
```

## 8. Levantar el sistema

```bash
cd /data/AdVaSys/deploy
./install-or-update.sh
```

- Aplicación: `http://IP_PUBLICA:8080`
- Healthcheck: `http://IP_PUBLICA:8080/api/health`

## 9. Go-live (obligatorio antes de abrir a usuarios)

- [ ] Cambiar contraseñas de `kami`, `Admin_1`, `Matri_1`, `Matri_2` tras el primer login.
- [ ] Confirmar que `UFW` está activo (solo 22 y 8080).
- [ ] Guardar una copia del `.env` de la VM fuera del servidor (respaldo cifrado).
- [ ] Activar **TLS** (fase P1): Cloudflare Tunnel o Load Balancer OCI con certificado.
  - Sin HTTPS las contraseñas viajan en texto plano.

## 10. Actualizar el sistema (versiones futuras)

```bash
cd /data/AdVaSys
git pull
cd deploy
./install-or-update.sh
```

El script reconstruye las imágenes y levanta los servicios; las migraciones de Prisma se ejecutan al arrancar el backend.

## Respaldos y detención

```bash
# Backup de la BD (manual)
cd /data/AdVaSys/deploy
docker compose --env-file .env -f docker-compose.beta.yml exec -T db \
  pg_dump -U intranet -d intranet_db > /data/backups/backup_$(date +%F).sql

# Detener el sistema
docker compose --env-file .env -f docker-compose.beta.yml down
```

> Recomendado: programar respaldos periódicos con cron y copiarlos a Object Storage (fase P3 del plan).