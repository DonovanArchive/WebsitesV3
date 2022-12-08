FROM node:18-alpine

ENV TZ=America/Chicago
WORKDIR /app
COPY . .
RUN apk add --no-cache lsof ffmpeg git gifsicle
RUN echo -e "update-notifier=false\nloglevel=error" > ~/.npmrc
RUN npm install --development
RUN npm run build
CMD ["node", "/app/src/index.js"]
