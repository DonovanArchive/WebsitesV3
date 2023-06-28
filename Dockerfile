FROM node:19-alpine

ENV TZ=America/Chicago
WORKDIR /app
RUN apk add --no-cache lsof ffmpeg git gifsicle
RUN npm i -g pnpm
RUN echo -e "update-notifier=false\nloglevel=error" > ~/.npmrc
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm run build
CMD ["node", "/app/build/src/index.js"]
