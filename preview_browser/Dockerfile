FROM node:21.5.0 as init

FROM init as init-dependencies

# Copy only things needed to run yarn install first to avoid reinstalling dependencies unless they change
COPY ./preview_browser/yarn.lock ./preview_browser/package.json ./preview_browser/.yarnrc.yml /preview_browser/
COPY ./preview_browser/.yarn/patches/* /preview_browser/.yarn/patches/
COPY ./preview_browser/.yarn/releases /preview_browser/.yarn/releases
COPY ./preview_browser/.yarn/sdks /preview_browser/.yarn/sdks

WORKDIR /preview_browser
RUN yarn install --immutable

FROM init-dependencies as init-source
COPY ./preview_browser/public /preview_browser/public
COPY ./preview_browser/src /preview_browser/src
COPY ./preview_browser/vite.config.js /preview_browser/vite.config.js

FROM init-source as build
RUN yarn build

FROM build as run
EXPOSE 80
USER root
ENV PORT=80
CMD ["yarn","start"]
