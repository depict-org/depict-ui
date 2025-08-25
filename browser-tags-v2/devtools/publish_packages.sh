#!/bin/bash

VERSION_STRATEGY=${1:-"patch"}
TAG=${2:-"latest"}

# Build npm packages
yarn clean # Ensure we clean parcel cache

# Update package versions
(cd packages/types && yarn version $VERSION_STRATEGY)
(cd packages/utilishared && yarn version $VERSION_STRATEGY)
(cd packages/performance-client && yarn version $VERSION_STRATEGY)
(cd packages/plp-styling && yarn version $VERSION_STRATEGY)
(cd packages/ui && yarn version $VERSION_STRATEGY)
(cd packages/react-ui && yarn version $VERSION_STRATEGY)
(cd packages/js-ui && yarn version $VERSION_STRATEGY)
(cd packages/portal-components && yarn version $VERSION_STRATEGY)

# Publish packages
(cd packages/types && yarn run publish --tag $TAG)
(cd packages/utilishared && yarn run publish --tag $TAG)
(cd packages/performance-client && yarn run publish --tag $TAG)
(cd packages/plp-styling && yarn run publish --tag $TAG)
(cd packages/ui && yarn run publish --tag $TAG)
(cd packages/react-ui && yarn run publish --tag $TAG)
(cd packages/js-ui && yarn run publish --tag $TAG)
(cd packages/portal-components && yarn run publish --tag $TAG)
