FROM node:18-alpine

ENV TZ=America/Chicago
WORKDIR /app
RUN apk add --no-cache lsof ffmpeg git gifsicle
RUN echo -e "update-notifier=false\nloglevel=error" > ~/.npmrc
COPY package.json package-lock.json ./
RUN npm install --development
COPY . .
RUN npm run build
CMD ["node", "/app/build/src/index.js"]
