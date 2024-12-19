FROM node:lts

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .
RUN npm run push
RUN npx prisma generate



RUN npm run build 
EXPOSE 3000

CMD [ "node", "build/main.js" ]