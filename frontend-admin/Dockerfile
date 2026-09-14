FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 정적 파일 서빙 + /api/admin 백엔드 프록시 (nginx.conf.template 참고)
FROM nginx:1.27-alpine
ENV PORT=8080
ENV BACKEND_ORIGIN=https://j2s-backend-401796347608.asia-northeast3.run.app
# /etc/resolv.conf 의 네임서버를 NGINX_LOCAL_RESOLVERS 로 내보낸다 (proxy_pass 가 백엔드 주소를 주기적으로 다시 조회하도록)
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
