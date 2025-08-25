#!/bin/bash

# clear yarn cache
yarn link-all

yarn cache clean

yarn

yarn install
