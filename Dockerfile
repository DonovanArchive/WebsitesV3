FROM node:20-alpine

ENV TZ=America/Chicago
ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout
ENV NEW_RELIC_APP_NAME="Websites"
WORKDIR /app
RUN apk add --no-cache lsof ffmpeg git gifsicle
RUN echo -e "update-notifier=false\nloglevel=error\nnode-linker=hoisted" > ~/.npmrc
RUN npm install --no-save pnpm
COPY package.json pnpm-lock.yaml ./
RUN npx pnpm install --frozen-lockfile
COPY . .
RUN npx pnpm build
RUN npx pnpm prune --prod
CMD ["node", "dist/src/index.js"]
