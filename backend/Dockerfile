FROM node:24.18.1

WORKDIR /backend

COPY package*.json ./
COPY prisma ./prisma/

RUN npm i

COPY . .

RUN npx prisma generate
RUN npm run build

CMD ["npm", "start"]
