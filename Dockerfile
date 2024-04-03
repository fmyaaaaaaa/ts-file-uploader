FROM node:20-alpine3.18 as build

ARG REACT_APP_REST_API_URL
ENV REACT_APP_REST_API_URL=${REACT_APP_REST_API_URL}

WORKDIR /app

COPY . .

RUN npm install && npm run build

FROM nginx:1.25.4-alpine

COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
