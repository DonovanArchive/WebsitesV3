FROM node:19-alpine

ENV TZ=America/Chicago
WORKDIR /app
RUN apk add --no-cache lsof ffmpeg git gifsicle
RUN echo -e "update-notifier=false\nloglevel=error\nnode-linker=hoisted" > ~/.npmrc
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN npm run build
CMD ["node", "/app/build/src/index.js"]
