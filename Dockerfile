FROM node:18-alpine

ENV TZ=America/Chicago
WORKDIR /tmp
COPY . .
RUN apk add --no-cache lsof ffmpeg git
RUN npm config set update-notifier false
RUN npm install --development
RUN npm run build
RUN mv /tmp/build /app
CMD ["node", "/app/src/index.js"]
