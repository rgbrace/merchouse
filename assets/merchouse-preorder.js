/* Merchouse · pre-order product page */
(function () {
  function readJSON(root, sel) {
    var el = root.querySelector(sel);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  // Offset (minutes) of America/Chicago at a given instant, e.g. -360 for CST.
  function chicagoOffset(date) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'shortOffset' }).formatToParts(date);
      var tz = (parts.find(function (p) { return p.type === 'timeZoneName'; }) || {}).value || '';
      var m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tz);
      if (!m) return -360;
      var mins = parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0);
      return m[1] === '-' ? -mins : mins;
    } catch (e) {
      return -360;
    }
  }

  // Close moment from "YYYY-MM-DD" + "HH:MM" in US Central time. Returns ms or null.
  function closeTime(dateStr, timeStr) {
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || '').trim());
    if (!d) return null;
    var t = /^(\d{1,2}):(\d{2})$/.exec((timeStr || '23:59').trim()) || [0, '23', '59'];
    var asUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2], t[1] === '23' && t[2] === '59' ? 59 : 0);
    var offset = chicagoOffset(new Date(asUtc - (-360) * 60000));
    return asUtc - offset * 60000;
  }

  function init(root) {
    var variants = readJSON(root, '[data-mh-variants]') || [];
    var labels = readJSON(root, '[data-mh-labels]') || {};
    var fieldsets = Array.prototype.slice.call(root.querySelectorAll('[data-mh-option]'));
    var idInput = root.querySelector('[data-mh-variant-id]');
    var buyBtn = root.querySelector('[data-mh-buy]');
    var msg = root.querySelector('[data-mh-msg]');
    var priceEls = root.querySelectorAll('[data-mh-price]');
    var form = root.querySelector('form');
    var closeAt = closeTime(root.getAttribute('data-close-date'), root.getAttribute('data-close-time'));
    var closed = closeAt != null && Date.now() >= closeAt;
    var optionCount = fieldsets.length;
    var selected = [];

    fieldsets.forEach(function (fs, i) {
      var btns = fs.querySelectorAll('[data-mh-value]');
      var pre = fs.querySelector('.is-selected');
      selected[i] = pre ? pre.getAttribute('data-mh-value') : null;
      if (btns.length === 1) selected[i] = btns[0].getAttribute('data-mh-value');
    });

    function matches(v, ignoreIndex) {
      for (var i = 0; i < optionCount; i++) {
        if (i === ignoreIndex || selected[i] == null) continue;
        if (v.options[i] !== selected[i]) return false;
      }
      return true;
    }

    function currentVariant() {
      for (var i = 0; i < optionCount; i++) if (selected[i] == null) return null;
      for (var j = 0; j < variants.length; j++) if (matches(variants[j], -1)) return variants[j];
      return null;
    }

    function render() {
      fieldsets.forEach(function (fs, i) {
        var isFit = !!fs.querySelector('.mh-fit');
        fs.querySelectorAll('[data-mh-value]').forEach(function (btn) {
          var val = btn.getAttribute('data-mh-value');
          var exists = false, available = false;
          variants.forEach(function (v) {
            if (v.options[i] === val && matches(v, i)) {
              exists = true;
              if (v.available) available = true;
            }
          });
          if (!isFit) {
            // Every size stays visible; sizes this fit doesn't come in (or sold out) are faded.
            btn.disabled = !available;
            btn.classList.toggle('is-unavailable', !available);
            btn.setAttribute('aria-disabled', available ? 'false' : 'true');
          }
          var on = selected[i] === val;
          btn.classList.toggle('is-selected', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });

      var v = currentVariant();
      if (v) {
        idInput.value = v.id;
        priceEls.forEach(function (el) { el.textContent = v.price; });
        if (window.history && window.history.replaceState) {
          var url = new URL(window.location.href);
          url.searchParams.set('variant', v.id);
          window.history.replaceState({}, '', url.toString());
        }
      }

      if (closed) {
        buyBtn.disabled = true;
        buyBtn.textContent = labels.closed || 'Pre-orders Closed';
      } else if (!v) {
        buyBtn.disabled = true;
        buyBtn.textContent = labels.select || 'Select a Size';
      } else if (!v.available) {
        buyBtn.disabled = true;
        buyBtn.textContent = labels.soldOut || 'Sold Out';
      } else {
        buyBtn.disabled = false;
        buyBtn.textContent = labels.buy || 'Pre-order Now';
      }
    }

    fieldsets.forEach(function (fs, i) {
      fs.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-mh-value]');
        if (!btn || btn.disabled) return;
        selected[i] = btn.getAttribute('data-mh-value');
        // Changing fit: drop a size that doesn't exist for the new fit.
        for (var k = 0; k < optionCount; k++) {
          if (k === i || selected[k] == null) continue;
          var ok = variants.some(function (v) { return v.options[k] === selected[k] && matches(v, k); });
          if (!ok) selected[k] = null;
        }
        if (msg) msg.textContent = '';
        render();
      });
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        if (closed || (optionCount && !currentVariant())) {
          e.preventDefault();
          if (msg) msg.textContent = closed ? (labels.closed || 'Pre-orders Closed') : 'Pick a size first.';
          return;
        }
        buyBtn.classList.add('is-loading');
      });
    }

    // Gallery views (Front | Back)
    var slides = root.querySelectorAll('[data-mh-view]');
    root.querySelectorAll('[data-mh-view-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = btn.getAttribute('data-mh-view-btn');
        slides.forEach(function (s) { s.classList.toggle('is-active', s.getAttribute('data-mh-view') === idx); });
        root.querySelectorAll('[data-mh-view-btn]').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      });
    });

    // Info tabs
    var tabs = root.querySelectorAll('[data-mh-tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var n = tab.getAttribute('data-mh-tab');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        root.querySelectorAll('[data-mh-panel]').forEach(function (p) {
          p.hidden = p.getAttribute('data-mh-panel') !== n;
        });
      });
    });

    // Live countdown
    var cd = root.querySelector('[data-mh-countdown]');
    if (cd && closeAt != null) {
      var nums = {};
      cd.querySelectorAll('[data-mh-cd]').forEach(function (el) { nums[el.getAttribute('data-mh-cd')] = el; });
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      var tick = function () {
        var left = Math.max(0, closeAt - Date.now());
        var sec = Math.floor(left / 1000);
        if (nums.d) nums.d.textContent = pad(Math.floor(sec / 86400));
        if (nums.h) nums.h.textContent = pad(Math.floor((sec % 86400) / 3600));
        if (nums.m) nums.m.textContent = pad(Math.floor((sec % 3600) / 60));
        if (nums.s) nums.s.textContent = pad(sec % 60);
        if (left <= 0) {
          clearInterval(timer);
          cd.classList.add('is-closed');
          cd.querySelector('[data-mh-cd-open]').hidden = true;
          cd.querySelector('[data-mh-cd-closed]').hidden = false;
          cd.querySelector('[data-mh-cd-units]').hidden = true;
          if (!closed) { closed = true; render(); }
        }
      };
      var timer = setInterval(tick, 1000);
      tick();
    }

    render();
  }

  function boot() {
    document.querySelectorAll('.mh-pdp').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
