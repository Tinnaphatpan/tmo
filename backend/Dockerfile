# Single image for the API and the one-off migrate/seed Container Apps Job:
# the job runs `npm run migrate` (ts-node over src/ + migrations/*.sql), so
# devDependencies, src/ and migrations/ are kept alongside dist/.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p storage/pdfs storage/signatures
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["node", "dist/main"]
