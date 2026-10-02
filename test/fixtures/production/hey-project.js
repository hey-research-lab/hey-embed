/*! HEY Research Lab <hey-project> v1 — https://heyresearch.xyz/developers/embeds
 * No dependencies. Reads only its own attributes (project, contract, variant, theme, label).
 * Sets no cookie, reads no storage, referrer, location or page content, and sends HEY nothing
 * but the frame request. */
(function () {
  'use strict';
  var ORIGIN = "https://heyresearch.xyz";
  var VARIANTS = ["compact","builder","changes","full","signal"];
  var THEMES = ["light","dark","auto"];
  var DEFAULT_VARIANT = "builder";
  var DEFAULT_THEME = "auto";
  var HEIGHTS = {"compact":92,"builder":196,"changes":280,"full":340,"signal":176};
  var MIN = 60, MAX = 1200;
  var MESSAGE = "hey-embed:height";
  if (typeof window === 'undefined' || !window.customElements || window.customElements.get('hey-project')) return;

  function pick(value, list, fallback) {
    var cleaned = String(value || '').trim().toLowerCase();
    return list.indexOf(cleaned) >= 0 ? cleaned : fallback;
  }

  function refOf(element) {
    var contract = String(element.getAttribute('contract') || '').trim().toLowerCase();
    if (/^(?:\d{1,9}:)?0x[0-9a-f]{40}$/.test(contract)) return contract;
    var project = String(element.getAttribute('project') || '').trim().toLowerCase();
    return /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(project) ? project : '';
  }

  class HeyProject extends HTMLElement {
    static get observedAttributes() { return ['project', 'contract', 'variant', 'theme', 'label']; }

    constructor() {
      super();
      this._frame = null;
      this._onMessage = this._onMessage.bind(this);
    }

    connectedCallback() {
      window.addEventListener('message', this._onMessage);
      this._render();
    }

    disconnectedCallback() {
      window.removeEventListener('message', this._onMessage);
    }

    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }

    _render() {
      var ref = refOf(this);
      // No valid project: the fallback link inside the element stays as it is.
      if (!ref) return;
      var variant = pick(this.getAttribute('variant'), VARIANTS, DEFAULT_VARIANT);
      var theme = pick(this.getAttribute('theme'), THEMES, DEFAULT_THEME);
      var src = ORIGIN + '/embed/project/' + encodeURIComponent(ref).replace(/%3A/gi, ':') + '?variant=' + variant + '&theme=' + theme;
      var root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      var frame = this._frame;
      if (!frame) {
        frame = document.createElement('iframe');
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
        frame.style.cssText = 'border:0;width:100%;max-width:100%;display:block;overflow:hidden;color-scheme:normal';
        root.appendChild(frame);
        this._frame = frame;
        this.style.display = 'block';
      }
      frame.setAttribute('title', String(this.getAttribute('label') || 'Project intelligence from HEY Research Lab').slice(0, 120));
      if (frame.getAttribute('src') !== src) {
        frame.style.height = HEIGHTS[variant] + 'px';
        frame.setAttribute('src', src);
      }
    }

    _onMessage(event) {
      if (!this._frame || event.source !== this._frame.contentWindow) return;
      var data = event.data;
      if (!data || data.type !== MESSAGE || typeof data.height !== 'number' || !isFinite(data.height)) return;
      this._frame.style.height = Math.min(Math.max(Math.ceil(data.height), MIN), MAX) + 'px';
    }
  }

  window.customElements.define('hey-project', HeyProject);
})();
