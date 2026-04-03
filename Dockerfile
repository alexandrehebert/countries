FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4103

ENV NODE_ENV=development
ENV PORT=4103

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
