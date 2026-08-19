# Despliegue Beta de Un Solo Paso

## Objetivo

Este proyecto queda preparado para un despliegue beta local con una sola URL de acceso:

- `PostgreSQL` persistente
- `Backend` Node.js + Prisma
- `Uploads` persistentes
- `Frontend` compilado para produccion
- `Nginx` como punto unico de entrada

El flujo recomendado es copiar **toda la carpeta del proyecto** por USB a la PC destino y ejecutar un solo script.

## Resultado esperado

Al finalizar el despliegue:

- La aplicacion responde en una sola URL local:
  - `http://localhost:8080`
  - `http://IP-DE-LA-PC:8080`
- El frontend, la API y los archivos subidos funcionan bajo el mismo origen:
  - `/`
  - `/api`
  - `/uploads`
- La base de datos y los archivos persistiran dentro de la carpeta `deploy/runtime`

## Archivos agregados para el despliegue

- `backend/Dockerfile.prod`
- `backend/docker/entrypoint.prod.sh`
- `frontend/Dockerfile.prod`
- `frontend/nginx/default.conf`
- `deploy/docker-compose.beta.yml`
- `deploy/.env.example`
- `deploy/install-or-update.ps1`
- `deploy/install-or-update.bat`
- `deploy/stop-beta.ps1`
- `deploy/backup-beta.ps1`

## Requisitos previos en la PC destino

1. Instalar Docker Desktop.
2. Activar la integracion de Docker Compose.
3. Verificar que Docker Desktop este iniciado.
4. Tener espacio libre suficiente en disco.

## Instalacion de un solo paso

1. Copiar la carpeta completa del proyecto a la PC destino.
2. Abrir la carpeta `deploy`.
3. Ejecutar:

```powershell
.\install-or-update.ps1
```

Tambien se puede ejecutar con doble clic sobre:

```text
deploy\install-or-update.bat
```

## Que hace el script

- Crea `deploy/.env` si no existe
- Crea carpetas persistentes:
  - `deploy/runtime/postgres-data`
  - `deploy/runtime/uploads`
  - `deploy/runtime/tmp`
  - `deploy/runtime/backups`
- Construye las imagenes necesarias
- Levanta `db`, `backend` y `web`
- Muestra las URLs locales disponibles

## Variables editables

Editar `deploy/.env` si deseas cambiar:

- `APP_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`

## Recomendacion inicial para beta

Usar algo parecido a esto en `deploy/.env`:

```env
COMPOSE_PROJECT_NAME=intranet_vallejo_beta
APP_PORT=8080
POSTGRES_DB=intranet_db
POSTGRES_USER=intranet
POSTGRES_PASSWORD=una_clave_segura
JWT_SECRET=una_clave_muy_larga_y_dificil
JWT_EXPIRES_IN=2h
CORS_ORIGINS=http://localhost:8080,http://192.168.18.149:8080
```

## Arquitectura final del despliegue

- `web`
  - Sirve el frontend compilado
  - Reenvia `/api` al backend
  - Reenvia `/uploads` al backend
- `backend`
  - Ejecuta migraciones Prisma al iniciar
  - Expone `/api` y `/uploads`
- `db`
  - Guarda la base de datos PostgreSQL

## Persistencia

La informacion queda en:

- Base de datos:
  - `deploy/runtime/postgres-data`
- Archivos subidos:
  - `deploy/runtime/uploads`
- Backups manuales:
  - `deploy/runtime/backups`

Estas carpetas deben incluirse en la rutina de backup.

## Si ya existe informacion previa

Si vienes de una instalacion anterior del sistema:

1. Copia los archivos de materiales actuales desde:
   - `backend/uploads`
2. Pegalos en:
   - `deploy/runtime/uploads`
3. Si tienes un respaldo SQL previo, restauralo antes de abrir el sistema a usuarios.

## Detener el sistema

```powershell
.\deploy\stop-beta.ps1
```

## Generar backup manual de la base de datos

```powershell
.\deploy\backup-beta.ps1
```

## Actualizar el sistema

Cuando haya cambios nuevos en el proyecto:

1. Reemplazar la carpeta del proyecto o actualizar sus archivos.
2. Ejecutar nuevamente:

```powershell
.\deploy\install-or-update.ps1
```

El mismo script reconstruye y vuelve a levantar el sistema.

## Validaciones recomendadas despues de instalar

1. Abrir `http://localhost:8080`
2. Iniciar sesion
3. Verificar que carga dashboard
4. Crear o editar un registro
5. Subir un material
6. Abrir un material
7. Confirmar que la API responde:

```text
http://localhost:8080/api/health
```

## Para acceso desde otra PC de la red

Usar:

```text
http://IP-DE-LA-PC-ACADEMIA:8080
```

Ejemplo:

```text
http://192.168.18.149:8080
```

## Paso siguiente recomendado

Una vez estable el acceso local, el siguiente paso natural es conectar Cloudflare Tunnel al servicio `web`, no al frontend de desarrollo ni directamente al puerto del backend.
