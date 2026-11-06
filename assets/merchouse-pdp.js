/* Merchouse · product page (full site) */
(function () {
  'use strict';

  function readJSON(root, sel) {
    var el = root.querySelector(sel);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  function formatMoney(cents, format) {
    var amount = (cents / 100).toFixed(2).replace(/\.00$/, '');
    var withCommas = amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (!format) return '$' + withCommas;
    return format.replace(/\{\{\s*\w+\s*\}\}/, withCommas);
  }

  // ---------- Cart (shared by the main button and quick-add buttons) ----------
  function addToCart(body) {
    var drawer = document.querySelector('cart-drawer');
    var notification = document.querySelector('cart-notification');
    var target = drawer || notification;
    var sections = [];
    if (target && typeof target.getSectionsToRender === 'function') {
      sections = target.getSectionsToRender().map(function (s) { return s.id; });
    } else if (document.getElementById('cart-icon-bubble')) {
      sections = ['cart-icon-bubble'];
    }
    if (sections.length) {
      body.sections = sections;
      body.sections_url = window.location.pathname;
    }
    var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    return fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.status) throw new Error(res.description || res.message || 'Could not add to cart.');
        if (target && typeof target.renderContents === 'function') {
          if (drawer && drawer.classList.contains('is-empty')) drawer.classList.remove('is-empty');
          target.renderContents(res);
        } else if (res.sections && res.sections['cart-icon-bubble']) {
          var bubble = document.getElementById('cart-icon-bubble');
          var html = new DOMParser().parseFromString(res.sections['cart-icon-bubble'], 'text/html');
          var fresh = html.querySelector('.shopify-section');
          if (bubble && fresh) bubble.innerHTML = fresh.innerHTML;
        }
        return res;
      });
  }

  function init(root) {
    var variants = readJSON(root, '[data-mh-variants]') || [];
    var labels = readJSON(root, '[data-mh-labels]') || {};
    var fieldsets = Array.prototype.slice.call(root.querySelectorAll('[data-mh-option]'));
    var optionCount = variants.length ? variants[0].options.length : 0;
    var kinds = {};
    fieldsets.forEach(function (fs) { kinds[+fs.getAttribute('data-mh-option')] = fs.getAttribute('data-kind'); });
    var colorIndex = typeof labels.colorIndex === 'number' ? labels.colorIndex : -1;

    var idInput = root.querySelector('[data-mh-variant-id]');
    var buyBtn = root.querySelector('[data-mh-buy]');
    var msg = root.querySelector('[data-mh-msg]');
    var priceEls = root.querySelectorAll('[data-mh-price]');
    var gbEl = root.querySelector('[data-mh-giveback]');
    var colorNameEl = root.querySelector('[data-mh-selected-name]');
    var form = root.querySelector('form.mh-pdp__form');
    var gbFlat = parseFloat(root.getAttribute('data-gb-flat')) || 0;
    var gbPercent = parseFloat(root.getAttribute('data-gb-percent')) || 0;
    var busy = false;

    // ----- initial selection -----
    var selected = [];
    for (var i = 0; i < optionCount; i++) selected[i] = null;
    fieldsets.forEach(function (fs) {
      var i = +fs.getAttribute('data-mh-option');
      var pre = fs.querySelector('.is-selected');
      if (pre) selected[i] = pre.getAttribute('data-mh-value');
      var btns = fs.querySelectorAll('[data-mh-value]');
      if (btns.length === 1) selected[i] = btns[0].getAttribute('data-mh-value');
    });
    // Carry choices across style links: ?color=…&fit=…&size=…
    var params = new URLSearchParams(window.location.search);
    fieldsets.forEach(function (fs) {
      var i = +fs.getAttribute('data-mh-option');
      var want = params.get(kinds[i]);
      if (!want) return;
      var match = Array.prototype.find.call(fs.querySelectorAll('[data-mh-value]'), function (b) {
        return b.getAttribute('data-mh-value').toLowerCase() === want.toLowerCase();
      });
      if (match) selected[i] = match.getAttribute('data-mh-value');
    });

    function matches(v, ignore) {
      for (var i = 0; i < optionCount; i++) {
        if (i === ignore || selected[i] == null) continue;
        if (v.options[i] !== selected[i]) return false;
      }
      return true;
    }
    function currentVariant() {
      for (var i = 0; i < optionCount; i++) if (selected[i] == null) return null;
      for (var j = 0; j < variants.length; j++) if (matches(variants[j], -1)) return variants[j];
      return null;
    }

    // ----- gallery -----
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-mh-media]'));
    var viewsBar = root.querySelector('[data-mh-views]');
    var viewBtns = root.querySelectorAll('[data-mh-view-btn]');
    var view = 'front';
    var pair = { front: slides[0] || null, back: null };

    function pickPair(variant) {
      var color = colorIndex > -1 && selected[colorIndex] ? selected[colorIndex].toLowerCase() : '';
      var pool = slides.filter(function (s) { return color && s.getAttribute('data-alt').indexOf(color) > -1; });
      if (!pool.length) pool = slides;
      var front = null, back = null;
      if (variant && variant.media) {
        front = slides.find(function (s) { return +s.getAttribute('data-mh-media') === variant.media && s.getAttribute('data-back') !== 'true'; }) || null;
        if (front && pool.indexOf(front) === -1) pool = [front].concat(pool);
      }
      front = front || pool.find(function (s) { return s.getAttribute('data-back') !== 'true'; }) || pool[0] || null;
      back = pool.find(function (s) { return s !== front && s.getAttribute('data-back') === 'true'; }) ||
        (pool.length > 1 ? pool.find(function (s) { return s !== front; }) : null);
      return { front: front, back: back };
    }

    function showView() {
      var active = view === 'back' && pair.back ? pair.back : pair.front;
      slides.forEach(function (s) { s.classList.toggle('is-active', s === active); });
      if (viewsBar) viewsBar.hidden = !pair.back;
      viewBtns.forEach(function (b) {
        var on = b.getAttribute('data-mh-view-btn') === (active === pair.back ? 'back' : 'front');
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    viewBtns.forEach(function (b) {
      b.addEventListener('click', function () { view = b.getAttribute('data-mh-view-btn'); showView(); });
    });

    // ----- render state -----
    function setButton(state, v) {
      if (!buyBtn) return;
      buyBtn.classList.toggle('is-loading', state === 'adding');
      buyBtn.classList.toggle('is-added', state === 'added');
      if (state === 'adding') { buyBtn.disabled = true; buyBtn.textContent = labels.adding || 'Adding…'; return; }
      if (state === 'added') { buyBtn.disabled = false; buyBtn.textContent = labels.added || 'Added to Cart'; return; }
      if (!v) { buyBtn.disabled = true; buyBtn.textContent = labels.select || 'Select a Size'; return; }
      if (!v.available) { buyBtn.disabled = true; buyBtn.textContent = labels.soldOut || 'Sold Out'; return; }
      buyBtn.disabled = false;
      buyBtn.textContent = labels.buy || 'Add to Cart';
    }

    function render() {
      fieldsets.forEach(function (fs) {
        var i = +fs.getAttribute('data-mh-option');
        var kind = kinds[i];
        fs.querySelectorAll('[data-mh-value]').forEach(function (btn) {
          var val = btn.getAttribute('data-mh-value');
          var available = variants.some(function (v) { return v.options[i] === val && v.available && matches(v, i); });
          if (kind === 'size') {
            btn.disabled = !available;
            btn.classList.toggle('is-unavailable', !available);
          } else {
            btn.classList.toggle('is-unavailable', !available);
          }
          var on = selected[i] === val;
          btn.classList.toggle('is-selected', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });

      if (colorNameEl && colorIndex > -1) colorNameEl.textContent = selected[colorIndex] || '';

      var v = currentVariant();
      // Price + give-back follow the chosen variant, or the cheapest match so far.
      var priceRef = v || variants.filter(function (x) { return matches(x, -1); })[0] || variants[0];
      if (priceRef) {
        priceEls.forEach(function (el) { el.textContent = priceRef.priceText; });
        if (gbEl) {
          var gb = gbFlat > 0 ? Math.round(gbFlat * 100) : Math.round(priceRef.price * gbPercent / 100);
          gbEl.textContent = formatMoney(gb, labels.moneyFormat);
        }
      }
      if (v) {
        idInput.value = v.id;
        if (window.history && window.history.replaceState) {
          var url = new URL(window.location.href);
          url.searchParams.set('variant', v.id);
          ['color', 'fit', 'size'].forEach(function (k) { url.searchParams.delete(k); });
          window.history.replaceState({}, '', url.toString());
        }
      }

      pair = pickPair(v || priceRef);
      if (!pair.back) view = 'front';
      showView();
      if (!busy) setButton('idle', v);
      updateStyleLinks();
    }

    // ----- style links keep the shopper's choices -----
    var styleLinks = root.querySelectorAll('[data-mh-style-link]');
    function updateStyleLinks() {
      styleLinks.forEach(function (a) {
        var url = new URL(a.getAttribute('href'), window.location.origin);
        ['color', 'fit', 'size'].forEach(function (k) { url.searchParams.delete(k); });
        Object.keys(kinds).forEach(function (i) {
          if (selected[i]) url.searchParams.set(kinds[i], selected[i]);
        });
        a.setAttribute('href', url.pathname + url.search);
      });
    }

    // ----- option clicks -----
    fieldsets.forEach(function (fs) {
      var i = +fs.getAttribute('data-mh-option');
      fs.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-mh-value]');
        if (!btn || btn.disabled) return;
        selected[i] = btn.getAttribute('data-mh-value');
        // Drop a size the new color/fit doesn't come in.
        for (var k = 0; k < optionCount; k++) {
          if (k === i || selected[k] == null || kinds[k] !== 'size') continue;
          var ok = variants.some(function (v) { return v.options[k] === selected[k] && v.available && matches(v, k); });
          if (!ok) selected[k] = null;
        }
        if (kinds[i] === 'color') view = 'front';
        if (msg) msg.textContent = '';
        render();
      });
    });

    // ----- add to cart -----
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = currentVariant();
        if (!v) { if (msg) msg.textContent = 'Pick a size first.'; return; }
        if (!v.available || busy) return;
        busy = true;
        if (msg) msg.textContent = '';
        setButton('adding');
        addToCart({ items: [{ id: v.id, quantity: 1 }] })
          .then(function () {
            setButton('added');
            setTimeout(function () { busy = false; setButton('idle', currentVariant()); }, 2200);
          })
          .catch(function (err) {
            busy = false;
            setButton('idle', currentVariant());
            if (msg) msg.textContent = err.message;
          });
      });
    }

    // ----- Complete the Look quick add -----
    root.querySelectorAll('[data-mh-quick-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var original = btn.textContent;
        btn.disabled = true;
        btn.textContent = labels.adding || 'Adding…';
        addToCart({ items: [{ id: +btn.getAttribute('data-mh-quick-add'), quantity: 1 }] })
          .then(function () { btn.textContent = 'Added'; })
          .catch(function () { btn.textContent = 'Try again'; })
          .finally(function () { setTimeout(function () { btn.disabled = false; btn.textContent = original; }, 2000); });
      });
    });

    // ----- tabs -----
    var tabs = root.querySelectorAll('[data-mh-tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var n = tab.getAttribute('data-mh-tab');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        root.querySelectorAll('[data-mh-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-mh-panel') !== n; });
      });
    });

    render();

    // Keep the current style visible in the scrolling style row.
    var row = root.querySelector('.mh-styles__row');
    var cur = row && row.querySelector('.mh-style.is-selected');
    if (row && cur && row.scrollWidth > row.clientWidth) {
      var li = cur.closest('li');
      row.scrollLeft = Math.max(0, li.offsetLeft - row.offsetLeft - row.clientWidth / 2 + li.offsetWidth / 2);
    }
  }

  function boot() { document.querySelectorAll('.mh-pdp--full').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
