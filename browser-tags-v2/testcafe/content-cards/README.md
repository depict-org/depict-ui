# Content card browser tests

Use Node 22. Install the workspace dependencies first.

Run these commands from `browser-tags-v2`:

```sh
yarn workspace @depict-ai/utilishared build
yarn jest --config packages/ui/jest.config.json --runTestsByPath packages/ui/src/shared/components/PLPResults/create_content_blocks.spec.ts --runInBand
yarn node testcafe/content-cards/build.mjs
yarn node testcafe/content-cards/run.mjs
```

The last command uses headless Chrome. Set `CHROME_PATH` if Chrome is outside its usual installation path.

The fixture uses the SDK's grid, product renderer, trailing card handling, media component, and card styles.
Its images use local SVG data. The tests do not call a merchant API.

The tests check ten layouts and three pagination transitions.
They check placement, empty row height, image fit, mobile spans, hidden cards, and separate banner heights.
The landscape image keeps `object-fit: cover`. Different image and card aspect ratios still cause normal cover cropping.

Screenshots and measurements go to `test-results/content-cards`.
Set `CONTENT_CARD_ARTIFACTS` to use another directory.
CI saves these files as the `content-card-visuals` artifact.

Use `--baseline` to disable the row fix. The first height check must fail.
Use `--serve` to open the fixture with an existing browser. The command prints its local URL.

The build script temporarily maps both utilishared import paths to ES10.
It restores `package.json` when the build ends.
