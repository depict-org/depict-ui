# Depict UI SDK

A comprehensive e-commerce SDK for building product search, category pages, and recommendation interfaces with Depict AI's services.

## How to develop on this?

Please see https://www.loom.com/share/7970c891825c4147a51a4beda7f31181 and direct questions to us on Slack.

What you want to change is probably in `browser-tags-v2/packages/ui`.

## Code style note

We initially used snake_case for variable names, but have since switched to camelCase. So newer code is and should use camelCase.

## Repository Structure

This repository contains multiple components for building modern e-commerce experiences:

### Core SDK (`/browser-tags-v2`)
The main SDK implementation built with Solid.js:
- **Core Framework**: Solid.js components for high performance and minimal bundle size
- **Build System**: Custom build scripts for production and development environments
- **Testing**: Lighthouse performance testing and TestCafe end-to-end tests
- **Polyfills**: Browser compatibility layer for older environments
- **DevTools**: Chrome extension and development utilities
- **React Wrapper**: React components that wrap the Solid.js core implementation

### Preview Browser (`/preview_browser`)
A SolidStart-based application for previewing and testing Depict UI components:
- Hosted at https://demo.depict.ai
- **Live Preview**: Preview of search, category, and recommendation components for any merchant.
- **Market/Locale Testing**: Test different markets and locales
- **Component Showcase**: Visual testing of product cards, headers, and cart functionality
- **Dark Mode Support**: Theme switching capabilities

### Example Storefronts (`/storefronts`)
Example implementations used for end-to-end testing the SDK (note these tests are broken due to bugs in testcafe):

- **`vanilla-js`**: Pure JavaScript implementation with TypeScript support
- **`vanilla-js-double-pages`**: Extended vanilla JS example with multiple page layouts
- **`react-web`**: React-based single-page application (using React wrappers around Solid.js components)
- **`next-web`**: Next.js implementation with server-side rendering
- **`next-commerce`**: Full-featured Next.js commerce site with cart, checkout, and authentication

### Documentation (`/external-documentation`)
Comprehensive API and integration documentation:
- **API Guide**: RESTful API documentation for recommendations, search, and tracking
- **SDK Guides**: React and JavaScript UI integration guides
- **Shopify Integration**: Complete Shopify app integration guide
- **Data Ingestion**: Setup guides for various e-commerce platforms (Shopify, Centra, Google Analytics)
- **OpenAPI Specification**: Complete API reference in OpenAPI 3.1 format

## Key Features

### Search & Discovery
- **Product Search**: Full-text search with filters, facets, and sorting
- **Category Pages**: Dynamic product listing pages with pagination
- **Query Suggestions**: Real-time search suggestions
- **Content Blocks**: Rich content integration within search results

### Recommendations
- **Product Recommendations**: Context-aware product suggestions
- **Category Recommendations**: Related category suggestions
- **User-Based Recommendations**: Personalized recommendations based on user behavior

### Tracking & Analytics
- **Event Tracking**: Product views, add-to-cart, and purchase tracking
- **Session Management**: User session tracking for personalization
- **Performance Monitoring**: Built-in error reporting and performance metrics

## Technology Stack

- **Core Framework**: Solid.js - A declarative, efficient, and flexible JavaScript library
- **React Integration**: React wrapper components for Solid.js core
- **Languages**: TypeScript, JSX, SCSS
- **Testing/dev tool Frameworks**: SolidStart, React, Next.js, vanilla JavaScript
- **Build Tools**: Parcel, Babel, custom build scripts
- **Testing**: TestCafe, Lighthouse
- **Documentation**: MDX, OpenAPI

## Getting Started

Each storefront example includes its own setup instructions. The SDK supports:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Server-side rendering (Next.js)
- Legacy browser support through polyfills
- Multiple locales and markets

## API Integration

The SDK connects to Depict's API endpoints for:
- Product search and filtering
- Category listings and navigation
- Personalized recommendations
- Analytics and tracking events

## License

This project's source code is licensed under the [MIT License](LICENSE). Two parts of this repository carry their own notices: the bundled Inter font is under the SIL Open Font License 1.1 (see [`preview_browser/src/fonts/LICENSE`](preview_browser/src/fonts/LICENSE)), and the vendored example storefronts under [`storefronts/`](storefronts/) are MIT with different copyright holders.

## Disclaimer

[`LICENSE`](LICENSE) is the governing agreement for this SDK. The first note below restates part of it in plain language for visibility; the second describes how responsibility divides in practice. Neither adds terms to `LICENSE`.

- The SDK is provided **"as is", without warranty of any kind, express or implied**, and neither the authors nor the copyright holders are liable for claims or damages arising from or in connection with it.
- You are responsible for how you deploy, configure, extend and style the SDK on your own site, and for any legal or regulatory obligations that attach to that site.

### Accessibility

We aim to follow the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) in the components this SDK renders, and we work to fix reported accessibility defects. We do not claim conformance to WCAG or any other accessibility standard.

The accessibility of a finished site depends largely on the integrator's own markup, styling, content and surrounding page structure, which are outside this SDK's control — so using the SDK does not by itself make a site accessible.

Found an accessibility problem in the SDK? Please [open an issue](https://github.com/depict-org/depict-ui/issues) — we would rather fix it than have it worked around.

