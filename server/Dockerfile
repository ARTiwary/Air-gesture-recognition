FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
USER node
EXPOSE 5000
CMD ["node", "index.js"]
