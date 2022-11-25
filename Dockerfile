FROM node:18-alpine

ENV TZ=America/Chicago
WORKDIR /tmp
COPY . .
RUN apk add --no-cache lsof ffmpeg git
RUN echo -e "update-notifier=false\nloglevel=error" > ~/.npmrc
RUN npm install --development
RUN npm run build
RUN mv /tmp/build /app
CMD ["node", "/app/src/index.js"]
