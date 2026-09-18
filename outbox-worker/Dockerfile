FROM node:24.11.1

WORKDIR /outbox

COPY package*.json ./

RUN npm i

COPY ./ ./

CMD ["sh", "-c", "npm run build && npm start"]
