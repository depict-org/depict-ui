# Depict package integration tests

First install and locally link everything in `storefronts/` so you're testing the latest code (`yarn link-all` / `pnpm link-all`).

A way to do that is the following:

```
# In browser-tags-v2/
./build_scripts/storefronts_install && ./build_scripts/storefronts_link && ./build_scripts/storefronts_build
```

To test everything locally, set your cwd to this folder (the folder containing this README.md file) and run `YRN_PATH="$(which yarn)" yarn ts-node test_all.ts`. The storefront servers will be started automatically.

To debug locally and work on the tests, pick a storefront, start the webserver, set your cwd to this folder, then run `store_path=[storefront-path] yarn testcafe --debug-on-fail "chrome" plp-ui.ts --native-automation` where `[storefront-path]` is `react-web`, `next-web` etc. `--native-automation` is necessary to work around https://github.com/DevExpress/testcafe/issues/7238

A way to serve a storefront is the following for e.g. react-web:

```
# In browser-tags-v2/
./build_scripts/storefronts_serve --only-react-web
```

The `YRN_PATH="$(which yarn)"` hack is a workaround to make the server command for `next-web` really truly use yarn 1, it has a tendency to pick up the yarn version from the current workspace otherwise and then the server won't start.
