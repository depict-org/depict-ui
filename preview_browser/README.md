# SolidStart

Everything you need to build a Solid project, powered by [`solid-start`](https://start.solidjs.com);

## Creating a project

```bash
# create a new project in the current directory
npm init solid@latest

# create a new project in my-app
npm init solid@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

Solid apps are built with _adapters_, which optimise your project for deployment to different environments.

By default, `npm run build` will generate a Node app that you can run with `npm start`. To use a different adapter, add it to the `devDependencies` in `package.json` and specify in your `vite.config.js`.

## Testing

```bash
yarn test
```

Unit tests live next to the code they cover as `*.test.ts` and run on node's built-in test runner,
which executes the TypeScript sources directly. That needs **Node >= 22.6** for type stripping — on
the Node 21 this app builds with, `yarn test` fails with an unhelpful "Unknown file extension .ts".
Nothing else about the app requires the newer Node, and CI runs the suite on its own Node 24 job
(`.github/workflows/preview-browser-test.yml`) separately from the Node 21 build.

The suite deliberately covers only modules with no imports, so it runs from a bare checkout with no
`yarn install`.
