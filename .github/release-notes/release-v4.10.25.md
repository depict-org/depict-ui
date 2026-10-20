Content cards now keep their full height at the end of short collections.
Empty final grid rows previously collapsed under cards that span two rows.
The API returned the card, but SDK 4.10.24 could render it with zero desktop height.

| Package | Install this version or later |
| --- | --- |
| `@depict-ai/ui` | **4.10.25** |
| `@depict-ai/react-ui` | **4.10.25** |
| `@depict-ai/js-ui` | **4.10.22** |

Update the SDK packages and the lockfile. Deploy the storefront.
React storefronts need UI and React UI. JavaScript storefronts need UI and JS UI.

Full-width banners keep their own height. Hidden cards do not create extra rows.
Mobile full-width cards keep the one-row cap.
Images retain `object-fit: cover`. Different image and card aspect ratios can still crop image edges.
Product rows through the last rendered multi-row card have equal heights. Long product titles can make earlier rows taller.

Live-site browser verification: **PASS**.
The test built UI and React UI from fix head `ce4aab4620b5ded6c36d1a9f584c751888913869`.
Headless Chromium replaced both production SDK chunks through request interception on `lucafaloni.com`.
The test used the site's React runtime, live APIs, and saved cards. It added no CSS or layout overrides.
All four URLs passed on desktop and mobile. Sixteen control and replacement page loads returned HTTP 200.
All listing API responses returned HTTP 200. No page errors occurred.

| Live page | SDK 4.10.24 desktop height | Fixed desktop card | Mobile height, unchanged |
| --- | --- | --- | --- |
| [Oxford](https://lucafaloni.com/en/gb/shop/oxford-cotton-shirts) | 0 px | 672×1,023.23 px; full 2×2 | 537.50 px |
| [Poplin](https://lucafaloni.com/en/gb/shop/poplin-cotton-shirts) | 533.82 px | 672×1,079.06 px; full 2×2 | 430 px |
| [Siena](https://lucafaloni.com/en/gb/shop/siena-pique-shirts) | 533.82 px | 672×1,079.06 px; full 2×2 | 221.65 px |
| [Cotton Shirts](https://lucafaloni.com/en/gb/shop/cotton-shirts) | No Depict listing | Editorial content and layout unchanged | Editorial content and layout unchanged |

Desktop used four product columns. Mobile used two product columns.
Poplin keeps its saved center position in desktop columns 2–3.
Cotton Shirts keeps identical editorial text, image assets, and layout bounds. It makes no Depict listing requests.
The browser test covers client rendering. It does not cover storefront server rendering.

Fix: [depict-ui#58](https://github.com/depict-org/depict-ui/pull/58), merged as `0722d9a6d04c12701adf9cec71a89afa414048e0`.
