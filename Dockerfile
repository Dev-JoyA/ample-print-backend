FROM node:22-alpine3.20

WORKDIR /app

COPY package.json* ./

RUN npm install

COPY . .

EXPOSE 4001

CMD ["npm", "start"]


