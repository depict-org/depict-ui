Search modal images now load on iPhones and iPads on sites that run the accessiBe accessibility widget.
On those sites, the "Categories & Collections" images stayed blank on iOS, and most product images stayed blank after typing a search.
Desktop and Android were not affected.

| Package | Install this version or later |
| --- | --- |
| `@depict-ai/ui` | **4.10.26** |
| `@depict-ai/react-ui` | **4.10.26** |
| `@depict-ai/js-ui` | **4.10.23** |

Update the SDK packages and the lockfile. Deploy the storefront.
React storefronts need UI and React UI. JavaScript storefronts need UI and JS UI.

Safari has no `requestIdleCallback`. The accessiBe widget adds its own, which calls back without the deadline the SDK reads, so images waiting for an idle moment never loaded.
The SDK now supplies a working deadline in that case. Browsers with a native `requestIdleCallback` behave as before.

Live-site browser verification: **PASS**.
The test ran headless iPhone 15 Pro WebKit on `oscarjacobson.com` with accessiBe loaded.
It applied the fix to the site's production SDK chunk through request interception and used the live APIs.

| Search modal check | SDK 4.10.20 | With the fix |
| --- | --- | --- |
| Category images, empty search | 0 of 9 after 25 s | 9 of 9 within 2 s |
| Images after typing "kavaj" | 4 of 14 | 14 of 14 |

Fix: [depict-ui#63](https://github.com/depict-org/depict-ui/pull/63), merged as `a2a96167b0b7150ab877f22226fd3e0771d857ad`.
