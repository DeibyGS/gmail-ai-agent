# Etapa 1: build de la app React
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (caching)
COPY package*.json ./
RUN npm ci

# Copiar fuentes y compilar
COPY . .
RUN npm run build

# Etapa 2: servir el build con nginx
FROM nginx:alpine

# Copiar el build generado al directorio de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto 80 (nginx por defecto); docker-compose lo mapea a 3000
EXPOSE 80
