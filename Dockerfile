FROM node:16-alpine

ENV TZ=America/Chicago
WORKDIR /app
COPY . .
RUN apk add --no-cache lsof ffmpeg
RUN npm --no-update-notifier install --development
RUN npm run build
CMD ["node", "/app/src/index.js"]
