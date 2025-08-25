# JavaScript flavour of the Depict UI library

Documentation:

1. https://docs.depict.ai/docs/search-js-ui-quickstart
2. https://docs.depict.ai/docs/category-page-javascript-sdk

Breaking changes:

- 1.1.0 made the `include_input_field` option of `SearchPage` default to true
- 1.3.0 added `page_url_creator` and changed typing to support it. The only breaking change is that this potentially causes type errors where the resolution is to move the generics to the provider instead of the SearchPage and CategoryPage components.
- 1.4.0 moved `depict-filter-sort-mobile-modal-container` from being a class to being an id
- 1.5.0 Added `brand_` translation string to Locale.
- 2.0.0 Made `enableContentSearch` `true` by default. Redesigned filter counts. Changed interface of RecommendationGrid and RecommendationSlider to sync (now return HTML elements instead of Promises of HTML elements).
- 3.0.16 (first `latest` tagged release of version 3): Please see this [migration guide](https://docs.depict.ai/other-guides/sdk-migration-v2-v3)
- 4.x.x: See https://docs.depict.ai/other-guides/sdk-migration-v3-v4
