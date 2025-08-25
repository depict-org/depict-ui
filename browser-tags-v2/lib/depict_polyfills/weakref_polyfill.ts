// // This was removed from NPM for some reason - Daniel
// // I modified it to use globalThis as we already have a polyfill for that
// // Below is the old project's Readme.MD
//# Simple WeakRef polyfill

// Polyfils for WeakRef. Supports natively chrome 36, firefox 6, Edge 12, IE 11, Opera 23, Safari 8. With additional polyfills support can go back futher.
//
// # npm / yarn
// Installation
// `npm i weakref-polyfill`
// `yarn add weakref-polyfill`
//
// Usage
// ```javascript
// require('weakref-polyfill');
// ```
//
// ```typescript
// import 'weakref-polyfill'
// ```
//
// // this was the package.json:
// {
//   "name": "weakref-pollyfill",
//   "version": "1.0.0",
//   "description": "weakref polyfill",
//   "main": "src/index.js",
//   "repository": {
//     "type": "git",
//     "url": "git+https://github.com/jaenster/weakref-polyfill.git"
//   },
//   "files": [
//     "/src"
//   ],
//   "keywords": [
//     "Polyfill",
//     "WeakRef",
//     "WeakMap",
//     "No dependencies",
//     "MIT",
//     "standalone",
//     "Garbage collector"
//   ],
//   "author": "jaenster",
//   "license": "MIT"
// }

/**
 * @description Simple polyfill for WeakRef
 * @author Jaenster
 */
export function polyfill_weakref() {
  // @ts-ignore
  globalThis.WeakRef ||= (function (wm) {
    function WeakRef(target) {
      wm.set(this, target);
    }

    WeakRef.prototype.deref = function () {
      return wm.get(this);
    };

    return WeakRef;
  })(new WeakMap());
}
