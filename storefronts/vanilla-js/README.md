# "Vanilla" JavaScript storefront

This is a project started from scratch using only plain HTML and JS (compiled from TypeScript, technically). This is our main testbed for the `js-ui` package, which doesn't rely on the target website using any third party framework.

## Developing

* `yarn install` to install third party dependencies
* `yarn link-all` to use your local build of Depict's packages from `browser-tags-v2/packages`, instead of the one published to NPM
* **NOTE:** This uses the native yarn linking feature, and new local builds will automatically be reflected in the development web server. However, it does make changes to `package.json` and `yarn.lock` that you don't want to commit. Either don't stage them, or unlink before committing.
* `yarn dev` starts the development webserver at [http://localhost:3000](http://localhost:3000)

To unlink from your local build and use Depict's packages from NPM, run `yarn unlink-all`
