/*! HEY Research Lab embed frame — posts its height to the parent, nothing else. */
(function () {
  'use strict';
  if (window.parent === window) return;
  var last = -1;
  function send(force) {
    if (!document.body) return;
    var height = Math.ceil(document.body.getBoundingClientRect().height);
    if (height > 0 && (force === true || height !== last)) {
      last = height;
      window.parent.postMessage({ type: "hey-embed:height", height: height }, '*');
    }
  }
  if (typeof ResizeObserver === 'function' && document.body) new ResizeObserver(send).observe(document.body);
  window.addEventListener('load', send);
  send();
  // A parent that starts listening after the frame loaded (a page still hydrating) would miss the first report: say it twice more.
  setTimeout(function () { send(true); }, 600);
  setTimeout(function () { send(true); }, 2500);
})();
