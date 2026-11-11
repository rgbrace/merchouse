/* Merchouse school/team shop: filter panel (tabs, live "Show N" count) and Load more.
   Filters are Shopify collection filters, so applying them is a normal page load with the
   filter.* params; counts come from the Section Rendering API. */
(function () {
  function init(root) {
    var section = root.getAttribute('data-section');
    var base = root.getAttribute('data-base');
    var form = root.querySelector('[data-mh-filter]');

    function sectionUrl(url) {
      var u = new URL(url, window.location.origin);
      u.searchParams.set('section_id', section);
      return u.toString();
    }
    function fetchDoc(url) {
      return fetch(sectionUrl(url), { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
    }

    if (form) {
      var toggle = form.querySelector('[data-mh-filter-toggle]');
      var panel = form.querySelector('[data-mh-filter-panel]');
      var action = form.querySelector('[data-mh-filter-action]');
      var tabs = form.querySelectorAll('[data-mh-tab]');
      var panes = form.querySelectorAll('[data-mh-pane]');
      var reqId = 0;

      // the selection as a query string; a Styles checkbox can stand for several product types
      function query() {
        var p = new URLSearchParams();
        form.querySelectorAll('input[type=checkbox]:checked').forEach(function (i) {
          var many = i.getAttribute('data-mh-values');
          var vals = many ? many.split('|').filter(Boolean) : [i.value];
          vals.forEach(function (v) { p.append(i.name, v); });
        });
        p.sort();
        return p.toString();
      }
      function currentQuery() {
        var p = new URLSearchParams(window.location.search);
        var out = new URLSearchParams();
        p.forEach(function (v, k) { if (k.indexOf('filter.') === 0) out.append(k, v); });
        out.sort();
        return out.toString();
      }
      var initial = currentQuery();

      function setAction() {
        var q = query();
        if (q === initial) { action.textContent = 'Done'; action.disabled = false; action.removeAttribute('data-go'); return; }
        action.setAttribute('data-go', base + (q ? '?' + q : ''));
        if (!q) { action.textContent = 'Show all'; action.disabled = false; return; }
        var id = ++reqId;
        action.textContent = 'Show …';
        fetchDoc(base + '?' + q).then(function (doc) {
          if (id !== reqId) return;
          var grid = doc.querySelector('[data-mh-grid]');
          var n = grid ? +grid.getAttribute('data-count') : 0;
          action.textContent = n ? 'Show ' + n : 'No matches';
          action.disabled = !n;
        }).catch(function () { if (id === reqId) { action.textContent = 'Show'; action.disabled = false; } });
      }

      function open(on) {
        panel.hidden = !on;
        toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
        form.classList.toggle('is-open', on);
        action.hidden = !on;
        if (on) setAction();
      }
      toggle.addEventListener('click', function () { open(panel.hidden); });

      tabs.forEach(function (t) {
        t.addEventListener('click', function () {
          var key = t.getAttribute('data-mh-tab');
          tabs.forEach(function (x) { var on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
          panes.forEach(function (p) { p.hidden = p.getAttribute('data-mh-pane') !== key; });
        });
      });

      form.addEventListener('change', function (e) {
        var l = e.target.closest('label');
        if (l) l.classList.toggle('is-selected', e.target.checked);
        setAction();
      });
      form.querySelectorAll('input[type=checkbox]:checked').forEach(function (i) { var l = i.closest('label'); if (l) l.classList.add('is-selected'); });

      action.addEventListener('click', function () {
        var go = action.getAttribute('data-go');
        if (go) window.location.href = go; else open(false);
      });
      form.addEventListener('submit', function (e) { e.preventDefault(); action.click(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { open(false); toggle.focus(); } });
    }

    // Load more: append the next page of cards in place
    root.addEventListener('click', function (e) {
      var more = e.target.closest('[data-mh-more]');
      if (!more) return;
      e.preventDefault();
      if (more.getAttribute('aria-busy') === 'true') return;
      more.setAttribute('aria-busy', 'true');
      more.textContent = 'Loading…';
      fetchDoc(more.href).then(function (doc) {
        var grid = root.querySelector('[data-mh-grid]');
        doc.querySelectorAll('[data-mh-grid] > .mh-shop-grid__item').forEach(function (li) { grid.appendChild(document.importNode(li, true)); });
        var next = doc.querySelector('[data-mh-more]');
        var wrap = more.parentElement;
        if (next) { more.href = next.getAttribute('href'); more.textContent = 'Load more'; more.removeAttribute('aria-busy'); }
        else wrap.remove();
      }).catch(function () { window.location.href = more.href; });
    });
  }

  function boot() { document.querySelectorAll('[data-mh-shop]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
