// Polyfills needed to support IE11 and browsers of the same age
import "core-js/modules/es.symbol";
import "core-js/es/array/from";
import "core-js/es/array/fill";
import "core-js/es/array/flat";
import "core-js/es/math/imul";
import "core-js/es/math/trunc";
import "core-js/es/symbol/iterator";
import "core-js/es/symbol/async-iterator";
import "core-js/features/promise/finally";
import "core-js/features/promise/any";
import "core-js/features/promise/all-settled";
import "core-js/features/promise/index";
import "core-js/features/promise/try";
import "core-js/features/object/assign";
import "core-js/features/map/map-values";
import "core-js/stable/array/for-each";
import "core-js/stable/reflect";
import "core-js/stable/array/find";
import "core-js/stable/array/includes";
import "core-js/stable/array/find-index";
import "core-js/stable/object/entries";
import "core-js/stable/structured-clone";
import "core-js/stable/object/from-entries";
import "core-js/proposals/string-left-right-trim";
import "core-js/stable/object/values";
import "core-js/stable/set/";
import "core-js/features/string/match-all";
import "core-js/web/url-search-params";
import "core-js/web/url";
import "core-js/web/dom-collections";
import "core-js/modules/es.weak-set";
import "core-js/proposals/relative-indexing-method";
import "element-scroll-polyfill";
import "intersection-observer"; // missing in corejs
import "current-script-polyfill"; // missing in corejs
import { fetch, Headers, Request, Response } from "whatwg-fetch/dist/fetch.umd.js"; // missing in corejs, continuation further down
import "web-animations-js/web-animations.min"; // missing in corejs
import "navigator.sendbeacon/dist/navigator.sendbeacon.min.js"; // missing in corejs. Also this polyfill is really strange how it's included, so feel free to replace with a better one
import { implementation as replaceAllPolyfill } from "string.prototype.replaceall"; // also not in corejs
import { implementation as startsWithPolyfill } from "string.prototype.startswith";
import { implementation as endsWithPolyfill } from "string.prototype.endswith";
import { implementation as includesPolyfill } from "string.prototype.includes";
import { is_native } from "./is_native";
import "proxy-polyfill/proxy.min.js"; // proxy polyfill
import "./event_target.ts";
import { polyfill_aev_once_if_needed } from "./add_event_listener_once";
import { ResizeObserver, ResizeObserverEntry, ResizeObserverSize } from "@juggle/resize-observer";
import polyfill_template_element from "./template";
import { polyfill_queueMicrotask } from "./queueMicrotask";
import { polyfill_weakref } from "./weakref_polyfill";
import { polyfill_replace_children } from "./replace_children";

(IntersectionObserver as any).prototype.POLL_INTERVAL = 100;

// more forEach polyfills for the IE11 bitch, source: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/forEach used in classList.forEach for example
if (window.DOMTokenList && !DOMTokenList.prototype.forEach) {
  DOMTokenList.prototype.forEach = function (callback, thisArg) {
    thisArg = thisArg || window;
    for (var i = 0; i < this.length; i++) {
      callback.call(thisArg, this[i], i, this);
    }
  };
}

(function (arr) {
  // ChildNode.remove() polyfill from https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove, because core-js apparently does not do DOM polyfills
  arr.forEach(function (item) {
    if (item.hasOwnProperty("remove")) {
      return;
    }
    Object.defineProperty(item, "remove", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function remove() {
        if (this.parentNode === null) {
          return;
        }
        this.parentNode.removeChild(this);
      },
    });
  });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
// Source: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/append()/append().md
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty("append")) {
      return;
    }
    Object.defineProperty(item, "append", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function append(...argArr) {
        var docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem) {
          var isNode = argItem instanceof Node;
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
        });

        this.appendChild(docFrag);
      },
    });
  });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);
// Source: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/prepend()/prepend().md
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty("prepend")) {
      return;
    }
    Object.defineProperty(item, "prepend", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function prepend(...argArr) {
        var docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem) {
          var isNode = argItem instanceof Node;
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
        });

        this.insertBefore(docFrag, this.firstChild);
      },
    });
  });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);

// from: https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/after()/after().md
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty("after")) {
      return;
    }
    Object.defineProperty(item, "after", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function after(...argArr) {
        var docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem) {
          var isNode = argItem instanceof Node;
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
        });

        this.parentNode.insertBefore(docFrag, this.nextSibling);
      },
    });
  });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

// polyfill String.prototype.replaceAll
if (!String.prototype.replaceAll || !is_native(String.prototype.replaceAll)) {
  if (Object.getOwnPropertyDescriptor(String.prototype, "replaceAll")?.configurable === false) {
    String.prototype.replaceAll = replaceAllPolyfill;
  } else {
    Object.defineProperty(String.prototype, "replaceAll", {
      enumerable: true,
      configurable: false,
      get() {
        return replaceAllPolyfill;
      },
      set(v) {
        return v;
      },
    });
  }
}

// polyfill String.prototpe.startsWith
String.prototype.startsWith ||= startsWithPolyfill;

// polyfill String.prototpe.endsWith
String.prototype.endsWith ||= endsWithPolyfill;

// polyfill String.prototpe.includes
String.prototype.includes ||= includesPolyfill;

if (!Element.prototype.matches) {
  // Element.matches polyfill from https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
  Element.prototype.matches =
  // @ts-ignore
  Element.prototype.matchesSelector ||
  // @ts-ignore
  Element.prototype.mozMatchesSelector ||
  // @ts-ignore
  Element.prototype.msMatchesSelector ||
  // @ts-ignore
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function (s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
        i = matches.length;
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1;
    };
}

// Element.closest polyfill from https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
if (!Element.prototype.closest) {
  Element.prototype.closest = function (s) {
    var el = this;

    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

(function () {
  // https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent

  if (typeof window.CustomEvent === "function") return false;

  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    var evt = document.createEvent("CustomEvent");
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  (window.CustomEvent as any) = CustomEvent;
})();
function ReplaceWithPolyfill() {
  // https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/replaceWith#polyfill
  "use-strict"; // For safari, and IE > 10
  var parent = this.parentNode,
    i = arguments.length,
    currentNode;
  if (!parent) return;
  if (!i)
    // if there are no arguments
    parent.removeChild(this);
  while (i--) {
    // i-- decrements i and returns the value of i before the decrement
    currentNode = arguments[i];
    if (typeof currentNode !== "object") {
      currentNode = this.ownerDocument.createTextNode(currentNode);
    } else if (currentNode.parentNode) {
      currentNode.parentNode.removeChild(currentNode);
    }
    // the value of "i" below is after the decrement
    if (!i)
      // if currentNode is the first argument (currentNode === arguments[0])
      parent.replaceChild(currentNode, this);
    // if currentNode isn't the first
    else parent.insertBefore(currentNode, this.nextSibling);
  }
}

Element.prototype.replaceWith ||= ReplaceWithPolyfill;
CharacterData.prototype.replaceWith ||= ReplaceWithPolyfill;
DocumentType.prototype.replaceWith ||= ReplaceWithPolyfill;

// The MIT License (MIT)
//
// Copyright (c) 2016 Financial Times
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// source: https://github.com/Financial-Times/polyfill-library/blob/8db31f38485465887f98cb8468092c68a247072f/polyfills/DOMTokenList/polyfill.js#L34

(function (global) {
  var nativeImpl = "DOMTokenList" in global && global.DOMTokenList;

  // if (
  // 		!nativeImpl ||
  // 		(
  // 			!!document.createElementNS &&
  // 			!!document.createElementNS('http://www.w3.org/2000/svg', 'svg') &&
  // 			!(document.createElementNS("http://www.w3.org/2000/svg", "svg").classList instanceof DOMTokenList)
  // 		)
  // 	) {
  // 	global.DOMTokenList = _DOMTokenList;
  // }

  // I'm too lazy to find their domtokenlist polyfill, it works in ie11 without - Daniel

  // Add second argument to native DOMTokenList.toggle() if necessary
  (function () {
    var e = document.createElement("span");
    if (!("classList" in e)) return;
    e.classList.toggle("x", false);
    if (!e.classList.contains("x")) return;
    e.classList.constructor.prototype.toggle = function toggle(token /*, force*/) {
      var force = arguments[1];
      if (force === undefined) {
        var add = !this.contains(token);
        this[add ? "add" : "remove"](token);
        return add;
      }
      force = !!force;
      this[force ? "add" : "remove"](token);
      return force;
    };
  })();

  // Add multiple arguments to native DOMTokenList.add() if necessary
  (function () {
    var e = document.createElement("span");
    if (!("classList" in e)) return;
    e.classList.add("a", "b");
    if (e.classList.contains("b")) return;
    var native = e.classList.constructor.prototype.add;
    e.classList.constructor.prototype.add = function () {
      var args = arguments;
      var l = arguments.length;
      for (var i = 0; i < l; i++) {
        native.call(this, args[i]);
      }
    };
  })();

  // Add multiple arguments to native DOMTokenList.remove() if necessary
  (function () {
    var e = document.createElement("span");
    if (!("classList" in e)) return;
    e.classList.add("a");
    e.classList.add("b");
    e.classList.remove("a", "b");
    if (!e.classList.contains("b")) return;
    var native = e.classList.constructor.prototype.remove;
    e.classList.constructor.prototype.remove = function () {
      var args = arguments;
      var l = arguments.length;
      for (var i = 0; i < l; i++) {
        native.call(this, args[i]);
      }
    };
  })();
})(window);

// childNode.before polyfill, source: https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/before
// from: https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/before()/before().md
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty("before")) {
      return;
    }
    Object.defineProperty(item, "before", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function before(...argArr) {
        var docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem) {
          var isNode = argItem instanceof Node;
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
        });

        this.parentNode.insertBefore(docFrag, this);
      },
    });
  });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

// Make sure DOMParser supports text/html in an attempt to fix:
// https://sentry.io/organizations/depictai-0o/issues/2220708443/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2233771741/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2233682441/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2233682448/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2233682471/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2238499986/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2238499988/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2236621708/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2236621743/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2236621748/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d
// https://sentry.io/organizations/depictai-0o/issues/2237310204/?project=5476183&query=is%3Aunresolved+Invalid+attempt+to&statsPeriod=14d

// source: https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
/*
 * DOMParser HTML extension
 * 2012-09-04
 *
 * By Eli Grey, http://eligrey.com
 * Public domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*! @source https://gist.github.com/1129031 */
/*global document, DOMParser*/

(function (DOMParser) {
  "use strict";

  var proto = DOMParser.prototype,
    nativeParse = proto.parseFromString;

  // Firefox/Opera/IE throw errors on unsupported types
  try {
    // WebKit returns null on unsupported types
    if (new DOMParser().parseFromString("", "text/html")) {
      // text/html parsing is natively supported
      return;
    }
  } catch (ex) {}

  proto.parseFromString = function (markup, type) {
    if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
      var doc = document.implementation.createHTMLDocument("");
      if (markup.toLowerCase().indexOf("<!doctype") > -1) {
        doc.documentElement.innerHTML = markup;
      } else {
        doc.body.innerHTML = markup;
      }
      return doc;
    } else {
      return nativeParse.apply(this, arguments);
    }
  };
})(DOMParser);

/*\
|*|
|*|  Polyfill which enables the passage of arbitrary arguments to the
|*|  callback functions of JavaScript timers (HTML5 standard syntax).
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/window.setInterval
|*|
|*|  Syntax:
|*|  var timeoutID = window.setTimeout(func, delay[, arg1, arg2, ...]);
|*|  var timeoutID = window.setTimeout(code, delay);
|*|  var intervalID = window.setInterval(func, delay[, arg1, arg2, ...]);
|*|  var intervalID = window.setInterval(code, delay);
|*|
\*/

(function () {
  setTimeout(
    function (arg1) {
      if (arg1 === "test") {
        // feature test is passed, no need for polyfill
        return;
      }
      var __nativeST__ = window.setTimeout;
      // @ts-ignore
      window.setTimeout = function (vCallback, nDelay /*, argumentToPass1, argumentToPass2, etc. */) {
        var aArgs = Array.prototype.slice.call(arguments, 2);
        return __nativeST__(
          vCallback instanceof Function
            ? function () {
                vCallback.apply(null, aArgs);
              }
            : vCallback,
          nDelay
        );
      };
    },
    0,
    "test"
  );

  var interval = setInterval(
    function (arg1) {
      clearInterval(interval);
      if (arg1 === "test") {
        // feature test is passed, no need for polyfill
        return;
      }
      var __nativeSI__ = window.setInterval;
      // @ts-ignore
      window.setInterval = function (vCallback, nDelay /*, argumentToPass1, argumentToPass2, etc. */) {
        var aArgs = Array.prototype.slice.call(arguments, 2);
        return __nativeSI__(
          vCallback instanceof Function
            ? function () {
                vCallback.apply(null, aArgs);
              }
            : vCallback,
          nDelay
        );
      };
    },
    0,
    "test"
  );
})();

// fetch polyfill continuation: old chrome versions have fetch but not i.e. Response constructor, fix that

const w = window;
w.fetch ||= fetch;
w.Headers ||= Headers;
w.Request ||= Request;
w.Response ||= Response;

polyfill_aev_once_if_needed();

window.ResizeObserver ||= ResizeObserver;
// @ts-ignore
window.ResizeObserverSize ||= ResizeObserverSize;
// @ts-ignore
window.ResizeObserverEntry ||= ResizeObserverEntry;

polyfill_template_element();

// globalThis polyfill from https://mathiasbynens.be/notes/globalthis
(function () {
  if (typeof globalThis === "object") return;
  Object.defineProperty(Object.prototype, "tmp_var", {
    get: function () {
      return this;
    },
    configurable: true, // This makes it possible to `delete` the getter later.
  });
  // @ts-ignore
  tmp_var.globalThis = tmp_var; // lolwat
  // @ts-ignore
  delete Object.prototype.tmp_var;
})();

polyfill_queueMicrotask();
polyfill_weakref();
polyfill_replace_children();

// IE11 doesn't have Node.protoype.contains, polyfill source: https://github.com/Financial-Times/polyfill-service/pull/183/files#diff-8e305a1a7f57bbe0b2426f5af9881f32917d1ee5110fb3c4b5c51391fa27744eR1

if (typeof Node !== "undefined") {
  Node.prototype.contains ||= function contains(node) {
    if (!(0 in arguments)) {
      throw new TypeError("1 argument is required");
    }

    do {
      if (this === node) {
        return true;
      }
    } while ((node = node && node.parentNode));

    return false;
  };
}
