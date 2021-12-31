FROM node:16-alpine

WORKDIR /app
COPY . .
RUN apk add --no-cache lsof ffmpeg
RUN npm --no-update-notifier install --silent --development
RUN npm run build
CMD ["node", "/app/src/index.js"]
