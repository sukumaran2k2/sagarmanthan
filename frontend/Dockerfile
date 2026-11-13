# --- Build stage ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite embeds VITE_* vars at build time
ARG VITE_API_BASE_URL=/api
ARG VITE_RSA_PUBLIC_KEY
ARG VITE_RECAPTCHA_SITE_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_BASE_URL
ENV VITE_RSA_PUBLIC_KEY=$VITE_RSA_PUBLIC_KEY
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

RUN npm run build

# --- Serve stage ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
