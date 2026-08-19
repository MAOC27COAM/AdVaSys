# 1. Usar una imagen base oficial de Node.js
# Se recomienda usar una versión LTS (Long Term Support)
FROM node:18-alpine

RUN apk add --no-cache postgresql-client

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiar los archivos de definición de dependencias
# Copiamos package.json y package-lock.json primero para aprovechar el cache de Docker.
# Si estos archivos no cambian, Docker no volverá a instalar las dependencias.
COPY package*.json ./

# 4. Instalar las dependencias del proyecto
# Usamos 'npm ci' en lugar de 'npm install' porque es más rápido y seguro para builds,
# ya que instala las versiones exactas de package-lock.json.
RUN npm ci

# 5. Copiar el resto del código fuente de la aplicación
COPY . .

#genrerar el cliente prisma
run npx prisma generate

# 6. Exponer el puerto en el que corre la aplicación
EXPOSE 4000

# 7. El comando para iniciar la aplicación
# Este comando se ejecutará cuando el contenedor inicie.
CMD [ "node", "src/server.js" ]
