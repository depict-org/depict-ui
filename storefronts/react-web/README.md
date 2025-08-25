# "Pure" React storefront

This is a project started from scratch using only vanilla React and React-DOM. The purpose is to know how our packages work without the Next.js tech stack, with its server side rendering and dedicated web components.

## Developing

* `yarn install` to install third party dependencies
* `yarn link-all` to use your local build of Depict's packages from `browser-tags-v2/packages`, instead of the one published to NPM
* **NOTE:** This uses the native yarn linking feature, and new local builds will automatically be reflected in the development web server. However, it does make changes to `package.json` and `yarn.lock` that you don't want to commit. Either don't stage them, or unlink before committing.
* `yarn dev` starts the development webserver at [http://localhost:3000](http://localhost:3000)

To unlink from your local build and use Depict's packages from NPM, run `yarn unlink-all`
