# --- Giai đoạn build ---
FROM node:20 AS build

WORKDIR /usr/src/app

# Copy file cấu hình trước để tận dụng cache
COPY package*.json ./
RUN npm install

# Copy toàn bộ source code vào
COPY . .

# Build project
RUN npm run build

# --- Giai đoạn chạy (production) ---
FROM nginx:alpine

# Copy file build ra thư mục web mặc định của nginx
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Khởi động nginx
CMD ["nginx", "-g", "daemon off;"]
