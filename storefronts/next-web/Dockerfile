# Install dependencies only when needed
FROM node:20-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY ./.yarn/releases/ ./.yarn/releases
COPY .yarnrc.yml ./

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN yarn --immutable


# # Rebuild the source code only when needed
FROM node:16-alpine AS storefront-next-web
WORKDIR /app
COPY --from=deps /app/.yarn ./.yarn
# Important to avoid "The project in /app/package.json doesn't seem to have been installed - running an install there might help"
COPY --from=deps /app/.pnp.cjs ./
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN yarn build

RUN cp .next/standalone/server.js server.js
RUN cp .next/standalone/package.json package.json

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["yarn", "node", "server.js"]
