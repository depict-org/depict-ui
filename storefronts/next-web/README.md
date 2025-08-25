# Next.js storefront

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). This should represent the most common tech platform used by our customers, while still being a slim and lean project ready to experiment with whatever new feature we're currently working on.

Currently it demonstrates dynamic routing for markets, where the initial `se/` or `dk/` in the URL path decides which market to use. SPA navigation back and forth should work seamlessly.

## Developing

* `yarn install` to install third party dependencies
* `yarn link-all` to use your local build of Depict's packages from `browser-tags-v2/packages`, instead of the one published to NPM
* **NOTE:** unfortunately, because we're currently using hardlinks to make the link between yarn 1 and yarn 3 work, changes to the local build of our package's won't be automatically reflected in a running web server in this repo. You will need to close it, run `yarn link-all` again, then re-start it.
* `yarn dev` starts the development webserver at [http://localhost:3000](http://localhost:3000)

To unlink from your local build and use Depict's packages from NPM, run `yarn unlink-all`
