#!/bin/bash

rm -rf node_modules

rm -rf site/.next

pnpm install
pnpm link-all

pnpm build

(cd site && pnpm dev)