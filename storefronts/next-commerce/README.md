# Next Commerce storefront

This is forked from an [e-commerce starter kit](https://github.com/vercel/commerce) maintained by Vercel, and serves as our most accurate representation of what one of our customer's website might look like (if it was developed fairly recently).

In the long run we hope to make this a presentable demo for our entire product line, including data ingestion from a major e-commerce platform. Avoid adding lots of programmer art here.

# DEPENDENCY WARNING

There's a newer version of some third party dependency, probably Turbo, that breaks the Docker build with the error message `'Failed to execute turbo.: Os { code: 2, kind: NotFound, message: "No such file or directory" }', crates/turborepo/src/main.rs:50:10`

Because of this, our Dockerfile uses `pnpm-lock.yaml` to ensure we don't accidentally get the newer versions.

## Developing

- `pnpm install` to install third party dependencies
- `pnpm link-all` to use your local build of Depict's packages from `browser-tags-v2/packages`, instead of the one published to NPM
- `pnpm build` to build some of the modules in the workspace
- `cd site`
- `pnpm dev` starts the development webserver at [http://localhost:3000](http://localhost:3000)

To unlink from your local build and use Depict's packages from NPM, run `pnpm unlink-all`
