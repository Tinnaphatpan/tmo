FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p storage/pdfs storage/signatures
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["node", "dist/main"]
