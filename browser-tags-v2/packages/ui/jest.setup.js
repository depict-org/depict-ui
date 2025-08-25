module.exports = function () {
  // When utilishared is imported, all kinds of DOM stuff is referenced, which jest doesn't have and needs polyfilling.
  HTMLCanvasElement.prototype.getContext = () => {
    // Empty mock
  };
  require("../../lib/depict_polyfills/the_polyfills");
};
