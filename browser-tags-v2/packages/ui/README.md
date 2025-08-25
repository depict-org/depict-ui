# Depict UI base package

You're most likely looking for https://www.npmjs.com/package/@depict-ai/js-ui or https://www.npmjs.com/package/@depict-ai/react-ui

Breaking changes:

- 1.1.0 made the `include_input_field` option of `SearchPage` default to true
- 1.2.0 added `page_url_creator` and changed typing to support it. The only breaking change is that this potentially causes type errors where the resolution is to move the generics to the provider instead of the SearchPage and CategoryPage components.
- 1.3.0 moved `depict-filter-sort-mobile-modal-container` from being a class to being an id
- 1.4.0 Added `brand_` translation string to Locale.
- 2.0.0 Made `enable_content_search` `true` by default. Redesigned filter counts.
- 3.0.19 (first `latest` tagged release of version 3): Please see this [migration guide](https://docs.depict.ai/other-guides/sdk-migration-v2-v3)
- 4.x.x: See https://docs.depict.ai/other-guides/sdk-migration-v3-v4
- 4.3.0: Removed `recommendations_cols_at_size`. Technically breaking change but since this wasn't ever exposed in the js-ui and react-ui packages, I'm releasing it as minor version.
