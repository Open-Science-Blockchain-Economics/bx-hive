# Stage 1: Build
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
# Note: Ensure that the build script in package.json generates the output in 'dist' folder
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy build artifacts from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run expects the container to listen on the port defined by the PORT environment variable.
# Nginx is configured to listen on 8080 by default in our nginx.conf
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

