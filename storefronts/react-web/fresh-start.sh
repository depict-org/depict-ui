#!/bin/bash

# clear yarn cache
rm -rf .parcel-cache

yarn cache clean

yarn install

yarn link-all

yarn dev