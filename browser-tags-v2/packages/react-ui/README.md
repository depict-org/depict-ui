# React flavour of the Depict UI

See the [documentation](https://docs.depict.ai/docs/sdk-intro).

Breaking changes:

- 1.3.0 moved `depict-filter-sort-mobile-modal-container` from being a class to being an id
- 1.4.0 Added `brand_` translation string to Locale.
- 1.5.0: Don't allow creating two `DepictProvider` instances. Don't allow two synced SearchPage and CategoryPage's to be created. Add `stateKey` property to all the components which can be used to create two instances of everything with completely different states.
- 2.0.0 Made `enableContentSearch` `true` by default. Redesigned filter counts. Added RecommendationGrid and RecommendationSlider.
- 3.0.18 (first `latest` tagged release of version 3): Please see this [migration guide](https://docs.depict.ai/other-guides/sdk-migration-v2-v3)
- 3.1.0: Changed `fetchRecommendations` to run the `displayTransformers` instead of `RecommendationSlider` and `RecommendationGrid`
- 4.x.x: See https://docs.depict.ai/other-guides/sdk-migration-v3-v4
