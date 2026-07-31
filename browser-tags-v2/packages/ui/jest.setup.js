module.exports = function () {
  // When utilishared is imported, all kinds of DOM stuff is referenced, which jest doesn't have and needs polyfilling.
  HTMLCanvasElement.prototype.getContext = () => {
    // Empty mock
  };
  // Stub rAF before the polyfills load: web-animations-js otherwise queues a tick at load that throws under
  // jsdom the first time a spec runs real timers. No spec in this package exercises rAF.
  window.requestAnimationFrame = () => 0;
  require("../../lib/depict_polyfills/the_polyfills");
};
