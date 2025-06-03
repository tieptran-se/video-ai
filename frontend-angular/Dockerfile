# Stage 1: Build the Angular application
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm run build -- --configuration production 

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine
COPY --from=build /app/dist/frontend-angular /usr/share/nginx/html 
COPY nginx.conf /etc/nginx/conf.d/default.conf 

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]