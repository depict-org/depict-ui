// https://www.npmjs.com/package/smoothscroll-polyfill
// ran through parcel and terser, then google closure compiler with advanced optimizations and then parcel and terser again
// provides smallest possible output and still runs

try {
  function o(o, t) {
    (this.scrollLeft = o), (this.scrollTop = t);
  }
  function t(o) {
    if (
      null === o ||
      "object" != typeof o ||
      void 0 === o.behavior ||
      "auto" === o.behavior ||
      "instant" === o.behavior
    )
      return !0;
    if ("object" == typeof o && "smooth" === o.behavior) return !1;
    throw new TypeError(
      "behavior member of ScrollOptions " + o.behavior + " is not a valid value for enumeration ScrollBehavior."
    );
  }
  function l(o, t) {
    return "Y" === t ? o.clientHeight + h < o.scrollHeight : "X" === t ? o.clientWidth + h < o.scrollWidth : void 0;
  }
  function e(o, t) {
    return "auto" === (o = c.getComputedStyle(o, null)["overflow" + t]) || "scroll" === o;
  }
  function r(o) {
    const t = l(o, "Y") && e(o, "Y");
    return (o = l(o, "X") && e(o, "X")), t || o;
  }
  function i(o) {
    let t = (d() - o.startTime) / 468,
      l = 0.5 * (1 - Math.cos(Math.PI * (1 < t ? 1 : t)));
    (t = o.h + (o.x - o.h) * l),
      (l = o.i + (o.y - o.i) * l),
      o.method.call(o.l, t, l),
      (t === o.x && l === o.y) || c.requestAnimationFrame(i.bind(c, o));
  }
  function s(t, l, e) {
    let r, s, n, p;
    const h = d();
    t === f.body
      ? ((r = c), (s = c.scrollX || c.pageXOffset), (n = c.scrollY || c.pageYOffset), (p = a.scroll))
      : ((r = t), (s = t.scrollLeft), (n = t.scrollTop), (p = o)),
      i({ l: r, method: p, startTime: h, h: s, i: n, x: l, y: e });
  }
  const c = window,
    f = document;
  if (!("scrollBehavior" in f.documentElement.style) || !0 === c.o) {
    let n;
    const p = c.HTMLElement || c.Element;
    var a = {
      scroll: c.scroll || c.scrollTo,
      scrollBy: c.scrollBy,
      g: p.prototype.scroll || o,
      scrollIntoView: p.prototype.scrollIntoView,
    };
    var d = c.performance && c.performance.now ? c.performance.now.bind(c.performance) : Date.now,
      h = ((n = c.navigator.userAgent), /MSIE |Trident\/|Edge\//.test(n) ? 1 : 0);
    (c.scroll = c.scrollTo =
      (o, l) => {
        void 0 !== o &&
          (!0 !== t(o)
            ? s(
                f.body,
                void 0 !== o.left ? ~~o.left : c.scrollX || c.pageXOffset,
                void 0 !== o.top ? ~~o.top : c.scrollY || c.pageYOffset
              )
            : a.scroll.call(
                c,
                void 0 !== o.left ? o.left : "object" != typeof o ? o : c.scrollX || c.pageXOffset,
                void 0 !== o.top ? o.top : void 0 !== l ? l : c.scrollY || c.pageYOffset
              ));
      }),
      (c.scrollBy = (o, l) => {
        void 0 !== o &&
          (t(o)
            ? a.scrollBy.call(
                c,
                void 0 !== o.left ? o.left : "object" != typeof o ? o : 0,
                void 0 !== o.top ? o.top : void 0 !== l ? l : 0
              )
            : s(f.body, ~~o.left + (c.scrollX || c.pageXOffset), ~~o.top + (c.scrollY || c.pageYOffset)));
      }),
      (p.prototype.scroll = p.prototype.scrollTo =
        function (o, l) {
          if (void 0 !== o)
            if (!0 !== t(o))
              (l = o.left),
                (o = o.top),
                s(this, void 0 === l ? this.scrollLeft : ~~l, void 0 === o ? this.scrollTop : ~~o);
            else {
              if ("number" == typeof o && void 0 === l) throw new SyntaxError("Value could not be converted");
              a.g.call(
                this,
                void 0 !== o.left ? ~~o.left : "object" != typeof o ? ~~o : this.scrollLeft,
                void 0 !== o.top ? ~~o.top : void 0 !== l ? ~~l : this.scrollTop
              );
            }
        }),
      (p.prototype.scrollBy = function (o, l) {
        void 0 !== o &&
          (!0 !== t(o)
            ? this.scroll({ left: ~~o.left + this.scrollLeft, top: ~~o.top + this.scrollTop, behavior: o.behavior })
            : a.g.call(
                this,
                void 0 !== o.left ? ~~o.left + this.scrollLeft : ~~o + this.scrollLeft,
                void 0 !== o.top ? ~~o.top + this.scrollTop : ~~l + this.scrollTop
              ));
      }),
      (p.prototype.scrollIntoView = function (o) {
        if (!0 !== t(o)) {
          for (o = this; o !== f.body && !1 === r(o); ) o = o.parentNode || o.host;
          const l = o.getBoundingClientRect(),
            e = this.getBoundingClientRect();
          o !== f.body
            ? (s(o, o.scrollLeft + e.left - l.left, o.scrollTop + e.top - l.top),
              "fixed" !== c.getComputedStyle(o).position &&
                c.scrollBy({ left: l.left, top: l.top, behavior: "smooth" }))
            : c.scrollBy({ left: e.left, top: e.top, behavior: "smooth" });
        } else a.scrollIntoView.call(this, void 0 === o || o);
      });
  }
} catch (e) {
  // don't want some error here to stop our whole script
  /* eslint-disable no-console */
  console.warn(e);
}
