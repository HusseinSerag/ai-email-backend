FROM node:lts

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate



RUN npm run build 
# Use a smaller base image for the final container
FROM node:lts-slim AS runner

# Set the working directory
WORKDIR /usr/app

# Copy only the necessary files from the build stage
COPY --from=builder /usr/app/node_modules ./node_modules
COPY --from=builder /usr/app/build ./build
COPY --from=builder /usr/app/prisma ./prisma
COPY --from=builder /usr/app/package.json ./package.json

EXPOSE 3000

CMD [ "node", "build/main.js" ]