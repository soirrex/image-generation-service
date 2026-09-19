FROM node:24.18.1

WORKDIR /backend

COPY package*.json ./

RUN npm i

COPY ./ ./

RUN npx prisma generate

CMD ["sh", "-c", "npm run build && npm start"]
