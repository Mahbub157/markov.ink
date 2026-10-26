/* Markov.ink shared UI helpers for /onboarding and /learn. */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Course glyphs, drawn as single ink strokes on a 32 x 32 grid.
  var GLYPHS = {
    numbers: '<text x="16" y="21.5" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" stroke="none" font-family="Inter,system-ui,sans-serif">123</text>',
    fraction: '<path d="M11 6v9M8.5 8.5 11 6M21 18c3-1 5 0 5 2.5S21 24 20 27h6M7 26 25 6"/>',
    x2: '<path d="M5 12l10 14M15 12 5 26M18 8c1-2 6-2 6 1 0 2-6 4-6 6h6"/>',
    triangle: '<path d="M6 25 16 7l10 18Z"/><path d="M16 7v18" stroke-dasharray="2 3"/>',
    wave: '<path d="M3 16c3-9 7-9 10 0s7 9 10 0 4-6 6-4"/>',
    curve: '<path d="M6 5v21h22M8 24c6-1 10-8 18-17"/>',
    bars: '<path d="M5 27h23M9 26v-8M15 26V11M21 26v-6M27 26V7"/>',
    matrix: '<path d="M9 6H6v20h3M23 6h3v20h-3"/><circle cx="12" cy="12" r="1.4"/><circle cx="20" cy="12" r="1.4"/><circle cx="12" cy="20" r="1.4"/><circle cx="20" cy="20" r="1.4"/>',
    leaf: '<path d="M7 25C7 13 15 7 26 6c-1 11-7 19-19 19ZM7 25l11-11"/>',
    globe: '<circle cx="16" cy="16" r="10"/><ellipse cx="16" cy="16" rx="4.5" ry="10"/><path d="M6 16h20"/>',
    atom: '<ellipse cx="16" cy="16" rx="11" ry="4.5"/><ellipse cx="16" cy="16" rx="11" ry="4.5" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="11" ry="4.5" transform="rotate(-60 16 16)"/><circle cx="16" cy="16" r="1.6"/>',
    flask: '<path d="M12.5 5h7M14 5v8L7.3 24.6A1.6 1.6 0 0 0 8.7 27h14.6a1.6 1.6 0 0 0 1.4-2.4L18 13V5M10 20h12"/>',
    book: '<path d="M16 9c-4-3-8-3-11-2v18c3-1 7-1 11 2 4-3 8-3 11-2V7c-3-1-7-1-11 2ZM16 9v18"/>',
    nib: '<path d="M16 4l8 10-8 14-8-14Z"/><path d="M16 4v12"/><circle cx="16" cy="17.5" r="1.6"/>',
    quote: '<path d="M7 23c3-1 6-4 6-9V9H7v6h6M19 23c3-1 6-4 6-9V9h-6v6h6"/>',
    star: '<path d="m16 5 3.2 7 7.6.8-5.7 5.1 1.6 7.5L16 21.6l-6.7 3.8 1.6-7.5-5.7-5.1 7.6-.8Z"/>'
  };

  function glyph(name, cls) {
    return '<svg class="' + (cls || 'glyph') + '" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (GLYPHS[name] || GLYPHS.star) + '</svg>';
  }

  var ICONS = {
    left: '<path d="M15 6l-6 6 6 6M9 12h11"/>',
    right: '<path d="M9 6l6 6-6 6M15 12H4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="M13.5 6.5l4 4"/>',
    school: '<path d="M3 9l9-5 9 5-9 5Z"/><path d="M7 11.5V16c3 2.5 7 2.5 10 0v-4.5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
    board: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20l4-4 4 4M7 9c2-2 3 1 5-1s3 0 5-1"/>',
    tray: '<path d="M3 13h5l1.5 3h5L16 13h5M3 13l3-8h12l3 8v6H3Z"/>'
  };

  function icon(name, cls) {
    return '<svg class="' + (cls || 'icon') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  function wordmark() {
    return '<a class="wordmark" href="./" aria-label="Markov.ink home"><span class="wm-markov">Markov</span><span class="wm-dot">.</span><span class="wm-ink">ink</span></a>';
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  window.MarkovUI = { esc: esc, glyph: glyph, icon: icon, wordmark: wordmark, reducedMotion: reducedMotion };
})();
