FROM testcafe/testcafe:latest as init
# yay, testcafe switches to "user", but that makes permissions after copy a nightmare
USER root

RUN apk add --update --no-cache bash zsh
RUN npm i -g corepack
ENV NODE_VERSION 20.9.0
# Download Node.js, install it, and clean up
RUN apk add --no-cache curl && \
    curl -fsSLO --compressed "https://unofficial-builds.nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64-musl.tar.xz" && \
    tar -xJf "node-v$NODE_VERSION-linux-x64-musl.tar.xz" -C /usr/local --strip-components=1 --no-same-owner && \
    rm "node-v$NODE_VERSION-linux-x64-musl.tar.xz" && \
    apk del curl
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python # native addons need python to build

COPY ./browser-tags-v2/tsconfig* /browser-tags-v2/

FROM init as init-dependencies

COPY ./browser-tags-v2/package.json ./browser-tags-v2/yarn.lock ./browser-tags-v2/.yarnrc.yml /browser-tags-v2/
COPY ./browser-tags-v2/.yarn /browser-tags-v2/.yarn
COPY ./browser-tags-v2/build_scripts /browser-tags-v2/build_scripts

# Frustrating, but idk a way to make this work with wildcards off the top of my head
COPY ./browser-tags-v2/packages/performance-client/package.json /browser-tags-v2/packages/performance-client/
COPY ./browser-tags-v2/packages/plp-styling/package.json /browser-tags-v2/packages/plp-styling/
COPY ./browser-tags-v2/packages/portal-components/package.json /browser-tags-v2/packages/portal-components/
COPY ./browser-tags-v2/packages/react-ui/package.json /browser-tags-v2/packages/react-ui/
COPY ./browser-tags-v2/packages/types/package.json /browser-tags-v2/packages/types/
COPY ./browser-tags-v2/packages/ui/package.json /browser-tags-v2/packages/ui/
COPY ./browser-tags-v2/packages/js-ui/package.json /browser-tags-v2/packages/js-ui/
COPY ./browser-tags-v2/packages/utilishared/package.json /browser-tags-v2/packages/utilishared/

WORKDIR /browser-tags-v2
RUN yarn install --immutable

COPY ./common/common/schema/displays/typescript /common/common/schema/displays/typescript
COPY ./common/common/schema/typescript /common/common/schema/typescript

FROM init-dependencies as init-packages
# Notable exclusion: ./browser-tags-v2/src
COPY ./browser-tags-v2/babel.config.js /browser-tags-v2/
COPY ./browser-tags-v2/lib /browser-tags-v2/lib
COPY ./browser-tags-v2/packages /browser-tags-v2/packages

RUN yarn build_packages

FROM init-packages as init-source
COPY ./browser-tags-v2 /browser-tags-v2

FROM init-packages as unit-test
COPY ./browser-tags-v2/jest.config.json /browser-tags-v2/
RUN IN_DOCKER=true yarn unit-test-ci

FROM init-source as lint
RUN printf '#!/bin/bash\nset -e\nyarn prettier --check .\nyarn lint' > lint.sh && chmod +x lint.sh
RUN ./lint.sh

FROM init-source as typecheck
RUN printf '#!/bin/bash\nout=$(yarn typecheck 2>&1)\nif [ ! -z "$out" ]; then\necho "$out"\nexit 1\nfi' > typecheck.sh && chmod +x typecheck.sh
RUN ./typecheck.sh

FROM init-source as build-scss-docs
RUN yarn build_scss_docs

FROM nginx:alpine as scss-docs
COPY --from=build-scss-docs /browser-tags-v2/packages/plp-styling/sassdoc/ /usr/share/nginx/html

FROM init-source as build-customer
RUN printf '#!/bin/bash\nyarn build stronger' > build.sh && chmod +x build.sh
RUN ./build.sh

FROM init as init-storefront-scripts
COPY ./browser-tags-v2/build_scripts/storefronts_build /browser-tags-v2/build_scripts/storefronts_build
COPY ./browser-tags-v2/build_scripts/storefronts_install /browser-tags-v2/build_scripts/storefronts_install
COPY ./browser-tags-v2/build_scripts/storefronts_link /browser-tags-v2/build_scripts/storefronts_link
COPY ./storefronts/react-web/.yarn/patches /storefronts/react-web/.yarn/patches
COPY ./storefronts/vanilla-js/.yarn/patches /storefronts/vanilla-js/.yarn/patches
COPY ./storefronts/next-web/.yarn/patches /storefronts/next-web/.yarn/patches
RUN chmod +x /browser-tags-v2/build_scripts/storefronts_build /browser-tags-v2/build_scripts/storefronts_install /browser-tags-v2/build_scripts/storefronts_link

### For storefronts: Copy source and install external packages

FROM init-storefront-scripts as init-next-commerce
# Have to copy pnpm-lock.yaml, something broken in a more recent version of... something
COPY ./storefronts/next-commerce/package.json ./storefronts/next-commerce/turbo.json ./storefronts/next-commerce/pnpm-workspace.yaml ./storefronts/next-commerce/pnpm-lock.yaml ./storefronts/next-commerce/link-replace.sh /storefronts/next-commerce/
COPY ./storefronts/next-commerce/site/package.json ./storefronts/next-commerce/site/.npmrc /storefronts/next-commerce/site/
# Frustrating, but idk a way to make this work with wildcards off the top of my head
COPY ./storefronts/next-commerce/packages/commerce/package.json /storefronts/next-commerce/packages/commerce/
COPY ./storefronts/next-commerce/packages/local/package.json /storefronts/next-commerce/packages/local/
COPY ./storefronts/next-commerce/packages/shopify/package.json /storefronts/next-commerce/packages/shopify/
COPY ./storefronts/next-commerce/packages/taskr-swc/package.json /storefronts/next-commerce/packages/taskr-swc/

RUN /browser-tags-v2/build_scripts/storefronts_install --only-next-commerce
COPY ./storefronts/next-commerce /storefronts/next-commerce

FROM init-storefront-scripts as init-next-web
# Don't copy yarn.lock, use the latest dependencies to check for future compat
COPY ./storefronts/next-web/package.json ./storefronts/next-web/link-replace.sh ./storefronts/next-web/.yarnrc.yml /storefronts/next-web/
COPY ./storefronts/next-web/.yarn /storefronts/next-web/.yarn

RUN /browser-tags-v2/build_scripts/storefronts_install --only-next-web
COPY ./storefronts/next-web /storefronts/next-web

FROM init-storefront-scripts as init-react-web
# Don't copy yarn.lock, use the latest dependencies to check for future compat
COPY ./storefronts/react-web/package.json /storefronts/react-web/
COPY ./storefronts/react-web/.yarn /storefronts/react-web/.yarn

RUN /browser-tags-v2/build_scripts/storefronts_install --only-react-web
COPY ./storefronts/react-web /storefronts/react-web

FROM init-storefront-scripts as init-vanilla-js
# Don't copy yarn.lock, use the latest dependencies to check for future compat
COPY ./storefronts/vanilla-js/package.json /storefronts/vanilla-js/
COPY ./storefronts/vanilla-js/.yarn /storefronts/vanilla-js/.yarn

RUN /browser-tags-v2/build_scripts/storefronts_install --only-vanilla-js
COPY ./storefronts/vanilla-js /storefronts/vanilla-js

### For storefronts: Link local packages

FROM init-next-commerce as init-linked-next-commerce

COPY --from=init-packages /browser-tags-v2/packages /browser-tags-v2/packages
RUN /browser-tags-v2/build_scripts/storefronts_link --only-next-commerce

FROM init-next-web as init-linked-next-web

COPY --from=init-packages /browser-tags-v2/packages /browser-tags-v2/packages
RUN /browser-tags-v2/build_scripts/storefronts_link --only-next-web

FROM init-react-web as init-linked-react-web

COPY --from=init-packages /browser-tags-v2/packages /browser-tags-v2/packages
RUN /browser-tags-v2/build_scripts/storefronts_link --only-react-web

FROM init-vanilla-js as init-linked-vanilla-js

COPY --from=init-packages /browser-tags-v2/packages /browser-tags-v2/packages
RUN /browser-tags-v2/build_scripts/storefronts_link --only-vanilla-js

### For storefronts: Build storefronts

FROM init-linked-next-commerce as init-built-next-commerce

RUN /browser-tags-v2/build_scripts/storefronts_build --only-next-commerce

FROM init-linked-next-web as init-built-next-web

RUN /browser-tags-v2/build_scripts/storefronts_build --only-next-web

FROM init-linked-react-web as init-built-react-web

RUN /browser-tags-v2/build_scripts/storefronts_build --only-react-web

FROM init-linked-vanilla-js as init-built-vanilla-js

RUN /browser-tags-v2/build_scripts/storefronts_build --only-vanilla-js

FROM init-dependencies as test-packages

# Get the build of the latest source
COPY --from=init-packages /browser-tags-v2/packages /browser-tags-v2/packages
COPY ./browser-tags-v2/testcafe /browser-tags-v2/testcafe
WORKDIR /browser-tags-v2/testcafe/package-tests

FROM test-packages as test-packages-next-commerce
COPY --from=init-built-next-commerce /storefronts/next-commerce /storefronts/next-commerce
ENTRYPOINT IN_DOCKER=true YRN_PATH="$(which yarn)" yarn ts-node test-package.ts next-commerce

FROM test-packages as test-packages-next-web
COPY --from=init-built-next-web /storefronts/next-web /storefronts/next-web
ENTRYPOINT IN_DOCKER=true YRN_PATH="$(which yarn)" yarn ts-node test-package.ts next-web

FROM test-packages as test-packages-react-web
COPY --from=init-built-react-web /storefronts/react-web /storefronts/react-web
ENTRYPOINT IN_DOCKER=true YRN_PATH="$(which yarn)" yarn ts-node test-package.ts react-web

FROM test-packages as test-packages-vanilla-js
COPY --from=init-built-vanilla-js /storefronts/vanilla-js /storefronts/vanilla-js
ENTRYPOINT IN_DOCKER=true YRN_PATH="$(which yarn)" yarn ts-node test-package.ts vanilla-js



