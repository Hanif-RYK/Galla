/*!
 * Galla — app interactions. Vanilla JavaScript, no dependencies.
 * Each feature is opt-in through data-* attributes, so you can delete any part you don't use.
 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  var root = document.documentElement;

  /* Theme ---------------------------------------------------------------- */
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    store.set("galla-theme", t);
    $$("[data-theme-toggle]").forEach(function (b) { b.setAttribute("aria-pressed", t === "dark"); });
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }
  $$("[data-theme-toggle]").forEach(function (b) {
    b.setAttribute("aria-pressed", root.getAttribute("data-theme") === "dark");
    b.addEventListener("click", function () { setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); });
  });

  /* Sidebar -------------------------------------------------------------- */
  if (store.get("galla-collapsed") === "1") root.classList.add("sidebar-collapsed");
  $$("[data-sidebar-collapse]").forEach(function (b) {
    b.setAttribute("aria-controls", "sidebar");
    var label = function (c) { b.setAttribute("aria-expanded", !c); b.setAttribute("aria-label", c ? "Expand sidebar" : "Collapse sidebar"); };
    label(root.classList.contains("sidebar-collapsed"));
    b.addEventListener("click", function () {
      var on = root.classList.toggle("sidebar-collapsed");
      store.set("galla-collapsed", on ? "1" : "0");
      label(on);
      setTimeout(function () { window.GallaCharts && window.GallaCharts.renderAll(); }, 30);
    });
  });
  $$("[data-sidebar-open]").forEach(function (b) {
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", function () {
      root.classList.add("sidebar-open"); b.setAttribute("aria-expanded", "true");
      var first = $(".sidebar a"); if (first) setTimeout(function () { first.focus(); }, 60);
    });
  });
  function closeDrawer() {
    if (!root.classList.contains("sidebar-open")) return;
    root.classList.remove("sidebar-open");
    var ob = $("[data-sidebar-open]"); if (ob) { ob.setAttribute("aria-expanded", "false"); if (getComputedStyle(ob).display !== "none") ob.focus(); }
  }
  $$("[data-sidebar-close], .sidebar-backdrop").forEach(function (b) { b.addEventListener("click", closeDrawer); });

  /* Dropdowns ------------------------------------------------------------ */
  $$("[data-dropdown]").forEach(function (dd) {
    var btn = $("[data-dropdown-toggle]", dd);
    if (!btn) return;
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !dd.classList.contains("open");
      closeDropdowns();
      dd.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open);
    });
    // Close the menu when keyboard focus moves out of it
    dd.addEventListener("focusout", function (e) {
      if (e.relatedTarget && !dd.contains(e.relatedTarget) && dd.classList.contains("open")) { dd.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  });
  function closeDropdowns() {
    $$("[data-dropdown].open").forEach(function (d) { d.classList.remove("open"); var b = $("[data-dropdown-toggle]", d); if (b) b.setAttribute("aria-expanded", "false"); });
  }
  document.addEventListener("click", function (e) { if (!e.target.closest(".menu")) closeDropdowns(); });

  /* Modals --------------------------------------------------------------- */
  var lastFocus = null;
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add("open");
    document.body.style.overflow = "hidden";
    // Focus the first visible field or button (hidden file inputs are skipped), else the close button
    var vis = function (x) { return x.offsetParent !== null; };
    var f = $$("input:not([type=hidden]), select, textarea, button:not([data-modal-close]), [tabindex='0']", m).filter(vis)[0] || $$("[data-modal-close]", m).filter(vis)[0];
    if (f) setTimeout(function () { if (!m.contains(document.activeElement)) f.focus(); }, 30);
  }
  function closeModal(m) {
    m.classList.remove("open");
    if (!$(".modal.open")) document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $$("[data-modal-open]").forEach(function (b) { b.addEventListener("click", function () { closeDropdowns(); openModal(b.getAttribute("data-modal-open")); }); });
  $$("[data-modal-close]").forEach(function (b) { b.addEventListener("click", function () { closeModal(b.closest(".modal")); }); });
  $$(".modal-backdrop").forEach(function (b) { b.addEventListener("click", function () { closeModal(b.closest(".modal")); }); });
  // Pressing Enter inside a modal form runs the modal's main button instead of reloading the page
  $$(".modal form").forEach(function (f) {
    function run() { var b = $("[data-modal-submit]", f.closest(".modal")); if (b) b.click(); }
    f.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    f.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName === "INPUT" && !/checkbox|radio|file|button|submit/.test(e.target.type)) { e.preventDefault(); run(); }
    });
  });
  document.addEventListener("keydown", function (e) {
    var openM = $(".modal.open");
    if (e.key === "Tab" && openM) {
      // Keep keyboard focus inside the open modal
      var f = $$("a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select, textarea, [tabindex]:not([tabindex='-1'])", openM).filter(function (x) { return x.offsetParent !== null; });
      if (f.length) {
        var first = f[0], last = f[f.length - 1];
        if (!openM.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (e.key === "Escape") {
      var openDd = $("[data-dropdown].open");
      $$(".modal.open").forEach(closeModal);
      closeDropdowns();
      if (openDd && openDd.contains(document.activeElement)) { var tg = $("[data-dropdown-toggle]", openDd); if (tg) tg.focus(); }
      closeDrawer();
    }
    var typing = /input|textarea|select/i.test((e.target.tagName || "")) || e.target.isContentEditable;
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
      // A page can mark its own main search box (the POS product search) with data-primary-search
      var s = $("[data-primary-search]") || $(".search input");
      if (s && s.offsetParent !== null) { e.preventDefault(); s.focus(); s.select && s.select(); }
    }
  });

  /* Toasts --------------------------------------------------------------- */
  function toast(msg) {
    var wrap = $(".toasts");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toasts"; wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
    t.querySelector("span").textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  window.gallaToast = toast;
  window.gallaOpenModal = openModal;
  window.gallaCloseModal = closeModal;
  $$("[data-toast]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.closest(".menu")) closeDropdowns();
      var m = b.closest(".modal");
      if (m && b.hasAttribute("data-modal-submit")) {
        var form = $("form", m);
        if (form && !validate(form)) return;
        if (form && form.hasAttribute("data-add-to")) addFromForm(form);
        if (form && form.hasAttribute("data-set-text")) {
          var field = $("[name=value]", form);
          $$(form.getAttribute("data-set-text")).forEach(function (el) { el.textContent = field.value.trim(); });
          field.defaultValue = field.value.trim();
        }
        if (form) form.dispatchEvent(new CustomEvent("galla:submit", { bubbles: true }));
        if (form) form.reset();
        closeModal(m);
      }
      toast(b.getAttribute("data-toast"));
    });
  });

  /* Tabs ----------------------------------------------------------------- */
  $$("[data-tabs]").forEach(function (group) {
    var tabs = $$('[role="tab"]', group);
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(tab);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length], true); }
      });
    });
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      window.GallaCharts && window.GallaCharts.renderAll();
    }
    // settings.html#ps2 opens the tab whose panel has that id (also when only the # part changes)
    function fromHash() {
      var id = location.hash.slice(1), t = id && tabs.filter(function (x) { return x.getAttribute("aria-controls") === id; })[0];
      if (t) select(t);
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
  });
  $$(".segmented").forEach(function (seg) {
    $$("button", seg).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        var target = seg.getAttribute("data-target");
        var data = b.getAttribute("data-set");
        if (target && data) {
          var chart = document.getElementById(target);
          chart.setAttribute("data-chart", data);
          window.GallaCharts.render(chart);
        }
      });
    });
  });

  /* Data table: search, filter, sort, paginate ---------------------------- */
  $$("[data-table]").forEach(function (wrap) {
    var table = $("table", wrap), tbody = $("tbody", table);
    var rows = $$("tr", tbody);
    var perPage = parseInt(wrap.getAttribute("data-per-page") || "8", 10);
    var search = $("[data-table-search]", wrap), filter = $("[data-table-filter]", wrap);
    var pager = $("[data-table-pager]", wrap), info = $("[data-table-info]", wrap);
    var page = 1, sortCol = -1, dir = 1, visible = rows;
    var empty = document.createElement("tr");
    empty.className = "empty-row";
    empty.innerHTML = '<td colspan="' + $$("th", table).length + '">No results match your search. Try a different word or clear the filter.</td>';

    function cellVal(tr, i) {
      var td = tr.children[i];
      // Use data-value when present (dates, money); otherwise numbers sort numerically, text alphabetically.
      var v = td.hasAttribute("data-value") ? td.getAttribute("data-value") : td.textContent.trim();
      if (/^[\s$€£\-+]*[\d.,]+\s*%?$/.test(v)) return parseFloat(v.replace(/[^0-9.\-]/g, ""));
      return v.toLowerCase();
    }
    function apply() {
      var q = search ? search.value.trim().toLowerCase() : "";
      var f = filter ? filter.value : "";
      visible = rows.filter(function (tr) {
        return (!q || tr.textContent.toLowerCase().indexOf(q) > -1) && (!f || tr.getAttribute("data-status") === f);
      });
      if (sortCol > -1) visible.sort(function (a, b) { var x = cellVal(a, sortCol), y = cellVal(b, sortCol); return x > y ? dir : x < y ? -dir : 0; });
      var pages = Math.max(1, Math.ceil(visible.length / perPage));
      page = Math.min(page, pages);
      tbody.innerHTML = "";
      var slice = visible.slice((page - 1) * perPage, page * perPage);
      slice.forEach(function (tr) { tbody.appendChild(tr); });
      if (!slice.length) tbody.appendChild(empty);
      if (info) info.textContent = visible.length ? "Showing " + ((page - 1) * perPage + 1) + "–" + ((page - 1) * perPage + slice.length) + " of " + visible.length : "No results";
      if (pager) {
        pager.innerHTML = "";
        var mk = function (label, p, dis, act) {
          var b = document.createElement("button");
          b.type = "button"; b.innerHTML = label; b.disabled = dis;
          if (act) { b.className = "active"; b.setAttribute("aria-current", "page"); }
          b.setAttribute("aria-label", typeof p === "number" ? "Page " + p : label);
          b.addEventListener("click", function () { page = p; apply(); });
          pager.appendChild(b);
        };
        mk("‹", page - 1, page === 1);
        // Many pages: show 1 … 4 5 6 … 11 so the pager fits on a phone
        var near = pages <= 7 ? null : [1, pages, page - 1, page, page + 1].concat(page <= 3 ? [2, 3, 4] : page >= pages - 2 ? [pages - 3, pages - 2, pages - 1] : []);
        for (var i = 1; i <= pages; i++) {
          if (!near || near.indexOf(i) > -1) mk(String(i), i, false, i === page);
          else if (near.indexOf(i - 1) > -1) { var gap = document.createElement("span"); gap.className = "pager-gap"; gap.textContent = "…"; gap.setAttribute("aria-hidden", "true"); pager.appendChild(gap); }
        }
        mk("›", page + 1, page === pages);
      }
    }
    $$("th[data-sort]", table).forEach(function (th) {
      th.tabIndex = 0;
      var go = function () {
        var i = Array.prototype.indexOf.call(th.parentNode.children, th);
        dir = sortCol === i ? -dir : 1; sortCol = i;
        $$("th[data-sort]", table).forEach(function (t) { t.removeAttribute("data-dir"); t.removeAttribute("aria-sort"); });
        th.setAttribute("data-dir", dir === 1 ? "asc" : "desc");
        th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
        apply();
      };
      th.addEventListener("click", go);
      th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    if (search) search.addEventListener("input", function () { page = 1; apply(); });
    if (filter) filter.addEventListener("change", function () { page = 1; apply(); });
    // Small API so other features (add row, row actions, export) can work with this table
    wrap.gallaTable = {
      add: function (tr) { rows.unshift(tr); page = 1; apply(); },
      remove: function (tr) { rows = rows.filter(function (r) { return r !== tr; }); apply(); },
      refresh: apply,
      visibleRows: function () { return visible.slice(); },
      allRows: function () { return rows.slice(); }
    };
    var all = $("[data-check-all]", table);
    if (all) all.addEventListener("change", function () { $$("tbody input[type=checkbox]", table).forEach(function (c) { c.checked = all.checked; }); });
    apply();
  });

  /* Tables that scroll sideways can be scrolled with the keyboard */
  function markScrollable() {
    $$(".table-wrap").forEach(function (w, i) {
      if (w.scrollWidth > w.clientWidth + 1) {
        w.setAttribute("tabindex", "0"); w.setAttribute("role", "region");
        // Give each scrollable table its own name (taken from the nearest heading) so screen readers can tell them apart
        var sec = w.closest("section, .card"), h = sec && $("h2, h3", sec);
        if (!w.hasAttribute("aria-label")) w.setAttribute("aria-label", (h ? h.textContent.trim() : "Table " + (i + 1)) + " (scrollable)");
      }
      else { w.removeAttribute("tabindex"); w.removeAttribute("role"); }
    });
  }
  markScrollable();
  var rsT; window.addEventListener("resize", function () { clearTimeout(rsT); rsT = setTimeout(markScrollable, 150); });

  /* Forms ---------------------------------------------------------------- */
  $$("[data-password-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var input = $("input", b.closest(".input-wrap"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
      b.setAttribute("aria-pressed", show);
    });
  });
  function validate(form) {
    var ok = true;
    // Required fields must be filled in; optional fields are checked only when something was typed
    $$("input, select, textarea", form).filter(function (f) { return f.required || (f.value.trim() && (f.hasAttribute("pattern") || f.type === "email" || f.type === "number")); }).forEach(function (f) {
      var v = f.value.trim(), n = Number(v);
      var bad = !v || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) || (f.minLength > 0 && f.value.length < f.minLength) ||
        (f.type === "number" && (!isFinite(n) || (f.min !== "" && n < Number(f.min)) || (f.max !== "" && n > Number(f.max)) || (f.step !== "any" && n !== Math.floor(n)))) ||
        (f.hasAttribute("pattern") && !new RegExp("^(?:" + f.getAttribute("pattern") + ")$").test(v));
      f.classList.toggle("is-invalid", bad);
      f.setAttribute("aria-invalid", bad);
      if (bad && ok) { f.focus(); ok = false; }
    });
    return ok;
  }
  $$("form[data-validate]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      form.dispatchEvent(new CustomEvent("galla:submit", { bubbles: true }));
      var go = form.getAttribute("data-redirect");
      var msg = form.getAttribute("data-success");
      if (msg) toast(msg);
      var btn = $("[type=submit]", form), note = $("[data-saved-note]", form);
      if (btn && form.hasAttribute("data-saved-label")) {
        var orig = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' + form.getAttribute("data-saved-label");
        btn.disabled = true;
        setTimeout(function () { btn.innerHTML = orig; btn.disabled = false; }, 2200);
      }
      if (note) { note.hidden = false; note.textContent = "Saved at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
      if (go) setTimeout(function () { location.href = go; }, 600);
    });
    $$("input, select, textarea", form).forEach(function (f) { f.addEventListener("input", function () { if (f.classList.contains("is-invalid")) { f.classList.remove("is-invalid"); f.removeAttribute("aria-invalid"); } }); });
  });
  $$(".dropzone").forEach(function (z) {
    var input = $("input[type=file]", z), label = $("[data-dropzone-label]", z);
    var show = function (files) { if (label && files.length) label.textContent = files.length === 1 ? files[0].name : files.length + " files selected"; };
    z.addEventListener("click", function (e) { if (e.target !== input) input.click(); });
    z.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", function () { show(input.files); });
    ["dragenter", "dragover"].forEach(function (t) { z.addEventListener(t, function (e) { e.preventDefault(); z.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (t) { z.addEventListener(t, function (e) { e.preventDefault(); z.classList.remove("is-over"); }); });
    z.addEventListener("drop", function (e) { show(e.dataTransfer.files); });
  });
  $$("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
  function copyText(text) {
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); toast(ok ? "Link copied to clipboard" : "Copy failed — select the address bar and copy it manually");
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast("Link copied to clipboard"); }, fallback);
    else fallback();
  }
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () { copyText(b.getAttribute("data-copy") || location.href); });
  });


  /* Add items from modal forms ----------------------------------------------
     <form data-add-to="#target" data-template="tpl-id"> + <template id="tpl-id">
     Inside the template, {field} is replaced with the value of the form field named "field". */
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function addFromForm(form) {
    var tpl = document.getElementById(form.getAttribute("data-template"));
    var target = $(form.getAttribute("data-add-to"));
    if (!tpl || !target) return;
    var vals = { today: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }), iso: new Date().toISOString().slice(0, 10), id: String(Math.floor(4822 + Math.random() * 100)) };
    $$("[name]", form).forEach(function (f) {
      var v = f.type === "checkbox" ? (f.checked ? "Yes" : "No") : f.value.trim();
      vals[f.name] = v;
      // {fieldTone} = data-tone of the chosen <option>; {fieldText} = a date field shown like {today}
      var opt = f.tagName === "SELECT" && f.options[f.selectedIndex];
      if (opt && opt.hasAttribute("data-tone")) vals[f.name + "Tone"] = opt.getAttribute("data-tone");
      if (f.type === "date" && v) { var dp = v.split("-"); vals[f.name + "Text"] = new Date(+dp[0], +dp[1] - 1, +dp[2]).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
      if (f.name === "name" || f.name === "contact") {
        var parts = v.split(/\s+/);
        vals.initials = ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
      }
    });
    if (vals.amount) { var amt = Number(String(vals.amount).replace(/[^0-9.]/g, "") || 0); vals.money = window.Galla ? window.Galla.fmt(amt) : "$" + amt.toFixed(2); }
    // {fieldMoney} = any decimal field (cost, price …) in the store currency, or "—" when left empty
    $$("input[inputmode=decimal][name]", form).forEach(function (f) {
      var raw = String(vals[f.name] || "").replace(/[^0-9.]/g, "");
      vals[f.name + "Money"] = raw ? (window.Galla ? window.Galla.fmt(Number(raw)) : "$" + Number(raw).toFixed(2)) : "—";
    });
    var html = tpl.innerHTML.replace(/\{(\w+)\}/g, function (_, k) { return k in vals ? esc(vals[k]) : ""; });
    var holder = document.createElement(target.tagName === "TBODY" || target.hasAttribute("data-table") ? "tbody" : "div");
    holder.innerHTML = html.trim();
    var el = holder.firstElementChild;
    var table = target.closest("[data-table]") || (target.hasAttribute("data-table") ? target : null);
    if (table && table.gallaTable) table.gallaTable.add(el);
    else target.insertBefore(el, target.firstChild);
    bindWithin(el);
  }
  // Re-bind dropdowns and toasts inside newly added rows, and show their prices in the store currency
  function bindWithin(el) {
    if (window.Galla) $$("[data-money]", el).forEach(function (m) { m.textContent = window.Galla.fmt(m.getAttribute("data-money")); });
    $$("[data-dropdown]", el).forEach(function (dd) {
      var btn = $("[data-dropdown-toggle]", dd);
      btn.setAttribute("aria-haspopup", "true"); btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function (e) { e.stopPropagation(); var open = !dd.classList.contains("open"); closeDropdowns(); dd.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); });
      dd.addEventListener("focusout", function (e) {
        if (e.relatedTarget && !dd.contains(e.relatedTarget) && dd.classList.contains("open")) { dd.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
      });
    });
    $$("[data-toast]", el).forEach(function (b) { b.addEventListener("click", function () { closeDropdowns(); toast(b.getAttribute("data-toast")); }); });
  }

  /* Row actions: data-row-action="status|Shipped|info" or "remove" ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-row-action]");
    if (!b) return;
    var tr = b.closest("tr"), wrap = b.closest("[data-table]");
    var parts = b.getAttribute("data-row-action").split("|");
    closeDropdowns();
    if (parts[0] === "remove") {
      if (wrap && wrap.gallaTable) wrap.gallaTable.remove(tr); else tr.remove();
      toast(b.getAttribute("data-done") || "Removed");
    } else if (parts[0] === "status") {
      var badge = $(".badge", tr.querySelector("[data-status-cell]") || tr);
      if (badge) { badge.className = "badge badge-" + parts[2]; badge.textContent = parts[1]; }
      // The row's data-status is what the table filter matches: change it only when the filter has that value
      // (on Customers the filter is the tier, so "Record payment" must not change it)
      var flt = wrap && $("[data-table-filter]", wrap);
      if (!flt || $$("option", flt).some(function (o) { return o.value === parts[1]; })) tr.setAttribute("data-status", parts[1]);
      var sc = tr.querySelector("[data-status-cell][data-value]"); if (sc && parts[1] === "Paid up") sc.setAttribute("data-value", "0");
      if (wrap && wrap.gallaTable) wrap.gallaTable.refresh();
      toast(b.getAttribute("data-done") || "Status changed to " + parts[1]);
    }
  });

  /* CSV export ------------------------------------------------------------
     data-export="file.csv" plus one of:
       data-export-table   → the table inside the nearest [data-table] (current search/filter applied)
       data-export-chart="#chartId" → labels + series from a chart
       data-export-items="selector" → elements with data-csv='{"Column":"value",...}' */
  function csvCell(v) {
    v = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
    // Text starting with = + - @ would run as a formula in Excel (phone "+1 555 …"); plain numbers like -12.50 stay as they are
    if (/^[=+\-@]/.test(v) && !/^-?[^\d\s]{0,4}\s?[\d,]+(\.\d+)?%?$/.test(v)) v = "'" + v;
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  // Text of a table cell with a space between its parts ("Shop rent" + "EX-612"), skipping hidden icons and initials
  function cellText(td) {
    var out = [], w = document.createTreeWalker(td, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) if (!n.parentNode.closest("[aria-hidden=true], .sr-only, svg")) out.push(n.textContent);
    return out.join(" ").replace(/\s+/g, " ").trim();
  }
  function download(name, rowsArr) {
    var csv = rowsArr.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    toast("Downloaded " + name + " (" + (rowsArr.length - 1) + " rows)");
  }
  $$("[data-export]").forEach(function (b) {
    b.addEventListener("click", function () {
      var name = b.getAttribute("data-export"), out = [];
      if (b.hasAttribute("data-export-table")) {
        var wrap = b.closest("[data-table]"), table = $("table", wrap);
        var keep = $$("th", table).map(function (th, i) { return th.textContent.trim() && !$("input", th) && !$(".sr-only", th) ? i : -1; }).filter(function (i) { return i > -1; });
        out.push(keep.map(function (i) { return $$("th", table)[i].textContent.trim(); }));
        wrap.gallaTable.visibleRows().forEach(function (tr) { out.push(keep.map(function (i) { var td = tr.children[i]; var b2 = $(".person b", td); var sm = $(".person small", td); return b2 ? b2.textContent + (sm && sm.textContent.indexOf("@") > -1 ? " <" + sm.textContent + ">" : "") : cellText(td); })); });
      } else if (b.hasAttribute("data-export-chart")) {
        var cfg = JSON.parse($(b.getAttribute("data-export-chart")).getAttribute("data-chart"));
        out.push(["Label"].concat(cfg.series.map(function (s) { return s.name + (cfg.suffix === "k" ? " (thousands)" : ""); })));
        cfg.labels.forEach(function (l, i) { out.push([l].concat(cfg.series.map(function (s) { return s.data[i]; }))); });
      } else if (b.hasAttribute("data-export-items")) {
        var items = $$(b.getAttribute("data-export-items")).filter(function (el) { return !el.hidden; }).map(function (el) { return JSON.parse(el.getAttribute("data-csv")); });
        if (items.length) { var cols = Object.keys(items[0]); out.push(cols); items.forEach(function (it) { out.push(cols.map(function (c) { return it[c]; })); }); }
      }
      if (out.length > 1) download(name, out); else toast("Nothing to export with the current filter");
    });
  });

  /* CSV import (demo: counts rows in the chosen file) ----------------------- */
  $$("[data-import]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = b.closest(".modal"), input = $("input[type=file]", m);
      var f = input && input.files[0];
      if (!f) { toast("Choose a CSV file first"); return; }
      var r = new FileReader();
      r.onload = function () {
        var n = String(r.result).split(/\r?\n/).filter(function (l) { return l.trim(); }).length - 1;
        closeModal(m);
        toast(Math.max(0, n) + " products found in " + f.name + ". Connect your backend to save them.");
      };
      r.readAsText(f);
    });
  });

  /* Filterable card lists: [data-filter-list] with [data-filter-search] and [data-filter-tag] buttons */
  $$("[data-filter-list]").forEach(function (box) {
    var items = $$(box.getAttribute("data-filter-list")), q = $("[data-filter-search]", box), tag = "", empty = $("[data-filter-empty]", box.parentNode);
    function run() {
      var term = q ? q.value.trim().toLowerCase() : "", shown = 0;
      items.forEach(function (it) {
        var ok = (!term || it.textContent.toLowerCase().indexOf(term) > -1) && (!tag || it.getAttribute("data-tag") === tag);
        it.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    }
    if (q) q.addEventListener("input", run);
    $$("[data-filter-tag]", box).forEach(function (b) { b.addEventListener("click", function () { tag = b.getAttribute("data-filter-tag"); run(); }); });
  });

  /* Date range picker (dropdown options update the button label) */
  $$("[data-range]").forEach(function (dd) {
    $$("[data-range-option]", dd).forEach(function (o) {
      o.addEventListener("click", function () {
        $("[data-range-label]", dd).textContent = o.textContent;
        closeDropdowns();
        // Optional: data-range-chart="#id" + data-months="N" shows only the last N points of that chart
        var chart = dd.hasAttribute("data-range-chart") ? $(dd.getAttribute("data-range-chart")) : null, n = +o.getAttribute("data-months");
        if (chart && n && window.GallaCharts) {
          if (!chart.hasAttribute("data-chart-full")) chart.setAttribute("data-chart-full", chart.getAttribute("data-chart"));
          var cfg = JSON.parse(chart.getAttribute("data-chart-full"));
          cfg.labels = cfg.labels.slice(-n);
          (cfg.series || []).forEach(function (s) { s.data = s.data.slice(-n); });
          chart.setAttribute("data-chart", JSON.stringify(cfg));
          window.GallaCharts.render(chart);
          var note = $("[data-range-note]", chart.closest(".card"));
          if (note) note.textContent = o.textContent.toLowerCase();
        }
        toast("Showing " + o.textContent.toLowerCase());
      });
    });
  });

  /* Notifications: mark all as read */
  $$("[data-mark-read]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      $$(".topbar .dot").forEach(function (d) { d.remove(); });
      $$(".notif").forEach(function (n) { n.style.opacity = ".55"; });
      toast("All notifications marked as read");
    });
  });

  /* Global search: Enter opens Products with the search filled in */
  var gs = $(".search input");
  if (gs) gs.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && gs.value.trim()) location.href = "products.html?q=" + encodeURIComponent(gs.value.trim());
  });
  var qp = new URLSearchParams(location.search).get("q"), ts = $("[data-table-search]");
  if (qp && ts) { ts.value = qp; ts.dispatchEvent(new Event("input")); }

  /* Account details --------------------------------------------------------
     A [data-account-form] with [data-account-field="first|last|email"] keeps the values in this browser only
     (demo — connect your backend to really save them) and fills every [data-account="name|first|initials|email"]. */
  var account = null;
  try { account = JSON.parse(store.get("galla-account")); } catch (e) { /* ignore bad data */ }
  // Ignore stored data that is not a {first, last, email} object of strings (old or edited by hand)
  if (!account || typeof account !== "object" || typeof account.first !== "string" || !account.first.trim()) account = null;
  else ["last", "email"].forEach(function (k) { if (typeof account[k] !== "string") account[k] = ""; });
  function showAccount(a) {
    if (!a || !a.first) return;
    var last = a.last || "";
    var v = { first: a.first, name: (a.first + " " + last).trim(), initials: (a.first[0] + (last[0] || "")).toUpperCase(), email: a.email };
    $$("[data-account]").forEach(function (el) { var k = el.getAttribute("data-account"); if (v[k]) el.textContent = v[k]; });
  }
  showAccount(account);
  $$("[data-account-form]").forEach(function (form) {
    var fields = $$("[data-account-field]", form);
    // Show the stored values in the form, and make them what "Discard" goes back to
    if (account) fields.forEach(function (f) { var k = f.getAttribute("data-account-field"); if (account[k] != null) f.value = f.defaultValue = account[k]; });
    form.addEventListener("galla:submit", function () {
      var a = {};
      fields.forEach(function (f) { f.value = f.defaultValue = f.value.trim(); a[f.getAttribute("data-account-field")] = f.value; });
      account = a;
      store.set("galla-account", JSON.stringify(a));
      showAccount(a);
    });
  });

  /* Store settings: currency, tax rate, receipt header and footer --------------------------
     window.GALLA is set in the <head> of every page from defaults + localStorage "galla-store"
     (saved on Settings → Store). This is demo storage in the visitor's browser only. */
  var DEFAULTS = { currency: "$", tax: 8, name: "Corner Basket", address: "14 Mall Road, Lahore", phone: "+92 300 000 0000", footer: "Thank you for shopping with us!" };
  var G = window.GALLA = window.GALLA || {};
  // Saved settings that are missing, of the wrong type or out of range fall back to the defaults
  Object.keys(DEFAULTS).forEach(function (k) {
    var v = G[k];
    if (k === "tax") { v = Number(v); G[k] = isFinite(v) && v >= 0 && v < 100 && G[k] !== "" && G[k] !== null ? v : DEFAULTS.tax; }
    else if (typeof v !== "string" || (k === "currency" && (!v.trim() || v.trim().length > 4))) G[k] = DEFAULTS[k];
  });
  for (var gk in G) if (!(gk in DEFAULTS)) delete G[gk];
  var r2 = function (v) { return Math.round((Number(v) + Number.EPSILON) * 100) / 100; };
  var num = function (v) { return typeof v === "number" && isFinite(v); };
  /* A sale read from storage is used only if it has the shape the receipt needs */
  function validSale(s) {
    return !!s && typeof s === "object" && typeof s.no === "string" && /^R-\d{1,8}$/.test(s.no) && !isNaN(new Date(s.date)) &&
      Array.isArray(s.lines) && s.lines.length > 0 && s.lines.every(function (l) { return l && typeof l.name === "string" && num(l.price) && num(l.qty) && l.qty > 0; }) &&
      ["subtotal", "discount", "tax", "total", "tendered", "taxRate"].every(function (k) { return num(s[k]); }) && typeof s.method === "string";
  }
  function readJSON(k, fallback) { try { var v = JSON.parse(store.get(k)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  var Galla = window.Galla = {
    config: G,
    fmt: function (v) {
      v = Number(v) || 0;
      return (v < 0 ? "-" : "") + Galla.symbol() + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    /* "$" stays tight ($4.50); letter symbols get a space (Rs 4.50, AED 4.50) */
    symbol: function () {
      var c = String(G.currency || "$").trim();
      return /[A-Za-z.]$/.test(c) ? c + " " : c;
    },
    esc: esc,
    saveConfig: function (patch) {
      for (var k in patch) G[k] = patch[k];
      var keep = {}; ["currency", "tax", "name", "address", "phone", "footer"].forEach(function (k) { keep[k] = G[k]; });
      store.set("galla-store", JSON.stringify(keep));
      Galla.applyConfig();
    },
    applyConfig: function () {
      $$("[data-money]").forEach(function (el) { el.textContent = Galla.fmt(el.getAttribute("data-money")); });
      $$("[data-currency]").forEach(function (el) { el.textContent = Galla.symbol(); });
      $$("[data-store]").forEach(function (el) { var v = G[el.getAttribute("data-store")]; if (v != null) el.textContent = v; });
    },
    /* Sales made on the POS page are kept in this browser (localStorage "galla-sales") */
    sales: function () { var v = readJSON("galla-sales", []); return Array.isArray(v) ? v.filter(validSale) : []; },
    validSale: validSale,
    r2: r2,
    /* Stock sold on the POS in this browser (localStorage "galla-stock": {"SKU": quantity sold}) */
    stockSold: function () {
      var v = readJSON("galla-stock", {}), out = {};
      if (v && typeof v === "object" && !Array.isArray(v)) for (var k in v) if (/^[\w-]{1,20}$/.test(k) && num(v[k]) && v[k] > 0) out[k] = Math.floor(v[k]);
      return out;
    },
    recordSold: function (lines) {
      var sold = Galla.stockSold();
      lines.forEach(function (l) { if (l.sku) sold[l.sku] = (sold[l.sku] || 0) + l.qty; });
      store.set("galla-stock", JSON.stringify(sold));
    },
    /* Clears the POS sales, held sales and sold stock kept in this browser */
    resetDemo: function () { ["galla-sales", "galla-held", "galla-stock"].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }); },
    addSale: function (sale) { var list = Galla.sales(); list.unshift(sale); store.set("galla-sales", JSON.stringify(list.slice(0, 50))); },
    /* Thermal receipt markup, shared by the POS, the receipt page and Settings preview */
    receipt: function (s) {
      var e = esc, f = Galla.fmt, d = new Date(s.date);
      if (isNaN(d)) d = new Date();
      var lines = s.lines.map(function (l) {
        return '<div class="r-item"><div class="r-line"><span>' + e(l.name) + "</span><span>" + f(l.price * l.qty) + '</span></div><div class="r-sub">' + l.qty + " × " + f(l.price) + "</div></div>";
      }).join("");
      var paid = s.method === "Cash" ? '<div class="r-sum"><span>Cash</span><span>' + f(s.tendered) + '</span></div><div class="r-sum"><span>Change</span><span>' + f(s.tendered - s.total) + "</span></div>"
        : '<div class="r-sum"><span>' + e(s.method) + "</span><span>" + f(s.total) + "</span></div>";
      return '<div class="receipt" role="document" aria-label="Receipt ' + e(s.no) + '">' +
        '<div class="r-head"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#1f1d19"/><path d="M12.5 9h15v22l-2.5-1.7-2.5 1.7-2.5-1.7-2.5 1.7-2.5-1.7-2.5 1.7z" fill="#fffdf8"/><path d="M16 15h8M16 19h8M16 23.5h4" stroke="#1f1d19" stroke-width="2" stroke-linecap="round"/></svg>' +
        "<b>" + e(G.name) + "</b><small>" + e(G.address) + "</small><small>" + e(G.phone) + "</small></div>" +
        '<hr class="r-rule"><div class="r-meta"><span>Receipt ' + e(s.no) + "</span><span>" + d.toLocaleDateString("en-GB") + "</span></div>" +
        '<div class="r-meta"><span>Cashier: ' + e(s.cashier || "Sana Khan") + "</span><span>" + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + "</span></div>" +
        '<div class="r-meta"><span>Customer: ' + e(s.customer || "Walk-in") + "</span></div>" +
        '<hr class="r-rule">' + lines + '<hr class="r-rule">' +
        '<div class="r-sum"><span>Subtotal</span><span>' + f(s.subtotal) + "</span></div>" +
        (s.discount ? '<div class="r-sum"><span>Discount</span><span>-' + f(s.discount) + "</span></div>" : "") +
        '<div class="r-sum"><span>Tax (' + s.taxRate + "%)</span><span>" + f(s.tax) + "</span></div>" +
        '<div class="r-sum r-total"><span>TOTAL</span><span>' + f(s.total) + "</span></div>" +
        '<hr class="r-rule">' + paid +
        '<div class="r-code" aria-hidden="true"></div><div class="r-foot">' + e(s.no) + "<br>" + e(G.footer) + "</div></div>";
    },
    /* Print only a receipt: copies it into a print area that is the only thing visible when printing */
    printReceipt: function (html) {
      var area = $(".print-area");
      if (!area) { area = document.createElement("div"); area.className = "print-area"; document.body.appendChild(area); }
      area.innerHTML = html;
      document.body.classList.add("print-receipt");
      var done = function () { document.body.classList.remove("print-receipt"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
      setTimeout(done, 1000);
    }
  };
  Galla.applyConfig();

  /* Sales history: add the sales made on the POS in this browser to the top of the table */
  $$("[data-local-sales]").forEach(function (wrap) {
    var tpl = document.getElementById(wrap.getAttribute("data-local-sales"));
    if (!tpl || !wrap.gallaTable) return;
    Galla.sales().slice().reverse().forEach(function (s) {
      var d = new Date(s.date), vals = {
        no: s.no, iso: s.date, date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        customer: s.customer || "Walk-in", items: s.lines.reduce(function (a, l) { return a + l.qty; }, 0), method: s.method, total: s.total.toFixed(2), money: Galla.fmt(s.total), cashier: s.cashier || "Sana Khan"
      };
      var holder = document.createElement("tbody");
      holder.innerHTML = tpl.innerHTML.replace(/\{(\w+)\}/g, function (_, k) { return k in vals ? esc(vals[k]) : ""; }).trim();
      wrap.gallaTable.add(holder.firstElementChild);
      bindWithin(wrap.querySelector("tbody tr"));
    });
  });

  /* Receipt page: receipt.html?no=R-10483 shows that receipt: a sale made on the POS in this browser,
     or one of the demo receipts in the page's <script type="application/json">. &print=1 opens the print window. */
  $$("[data-receipt-view]").forEach(function (box) {
    var q = new URLSearchParams(location.search), no = (q.get("no") || "").trim().toUpperCase().replace(/^#/, "").replace(/^R(\d)/, "R-$1");
    var demo = [];
    try { demo = JSON.parse($("script[type='application/json']", box).textContent); } catch (e) { /* no demo receipts */ }
    demo = (Array.isArray(demo) ? demo : [demo]).filter(validSale);
    var sale = q.has("no") ? Galla.sales().concat(demo).filter(function (s) { return s.no === no; })[0] : demo[0];
    var printBtns = $$("[data-print-receipt]");
    if (!sale) {
      var valid = /^R-\d{1,8}$/.test(no);
      box.innerHTML = '<div class="receipt-missing" role="status"><b></b><p>It is not in the demo data or in the sales made on the POS in this browser.</p><a class="btn" href="sales.html">Go to sales history</a></div>';
      $("b", box).textContent = !no ? "No receipt number was given" : valid ? "Receipt " + no + " was not found" : "That is not a receipt number";
      $("p", box).textContent = valid ? "It is not in the demo data or in the sales made on the POS in this browser." : "Receipt numbers look like R-10482. Open a receipt from the sales history.";
      $$("[data-receipt-no]").forEach(function (el) { el.textContent = valid ? no : "—"; });
      $$("[data-receipt-only]").forEach(function (el) { el.hidden = true; });
      printBtns.forEach(function (b) { b.disabled = true; });
      return;
    }
    box.innerHTML = Galla.receipt(sale);
    printBtns.forEach(function (b) { b.addEventListener("click", function () { Galla.printReceipt(Galla.receipt(sale)); }); });
    $$("[data-receipt-no]").forEach(function (el) { el.textContent = sale.no; });
    $$("[data-receipt-cashier]").forEach(function (el) { el.textContent = sale.cashier || "Sana Khan"; });
    var st = typeof sale.status === "string" ? sale.status : "Completed";
    $$("[data-receipt-status]").forEach(function (el) { el.textContent = st; el.className = "badge " + (st === "Refunded" ? "badge-danger" : st === "Completed" ? "badge-success" : "badge-warning"); });
    $$("[data-refund-link]").forEach(function (a) { a.href = "returns.html?receipt=" + encodeURIComponent(sale.no) + "#new-return"; });
    if (q.get("print") === "1") setTimeout(function () { Galla.printReceipt(Galla.receipt(sale)); }, 300);
  });
  /* returns.html?receipt=R-10482#new-return fills the receipt number in the New return form */
  var rq = new URLSearchParams(location.search).get("receipt"), rf = $("form [name=receipt]");
  if (rq && rf && /^R-\d{1,8}$/.test(rq)) rf.value = rq;

  /* Open a modal from the address: products.html#new-product, purchases.html#new-po */
  if (location.hash.length > 1) {
    var hm = null; try { hm = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { /* malformed address */ }
    // Modals marked data-no-hash (POS payment, discount, receipt) need the page's state and never open from the address
    if (hm && hm.classList.contains("modal") && !hm.hasAttribute("data-no-hash")) setTimeout(function () { openModal(hm.id); }, 50);
  }

  /* Stock adjustments (inventory.html): [data-adjust="SKU"] pre-selects the product,
     [data-stock-form] updates the on-hand number, bar and status of that product's row */
  $$("[data-adjust]").forEach(function (b) {
    b.addEventListener("click", function () { var sel = $("[data-stock-form] [name=sku]"); if (sel) sel.value = b.getAttribute("data-adjust"); });
  });
  // Shows a new on-hand number in a product row: number, level bar (inventory), status badge
  function setStock(tr, next, flash) {
    var cell = $("[data-onhand]", tr), ro = $("[data-reorder]", tr);
    var reorder = parseInt(ro && ro.getAttribute("data-reorder"), 10) || 1;
    cell.textContent = next; cell.setAttribute("data-value", next);
    var bar = $(".progress", tr);
    if (bar) {
      bar.className = "progress" + (next === 0 ? " tone-danger" : next <= reorder ? " tone-warning" : " tone-success");
      $("span", bar).style.width = Math.min(100, next / (reorder * 3) * 100) + "%"; bar.setAttribute("aria-label", next + " on hand");
    }
    var label = next === 0 ? "Out of stock" : next <= reorder ? "Low stock" : "In stock", kind = next === 0 ? "danger" : next <= reorder ? "warning" : "success";
    $("[data-status-cell]", tr).innerHTML = '<span class="badge badge-' + kind + '">' + label + "</span>";
    tr.setAttribute("data-status", label);
    if (flash) { tr.classList.remove("flash"); void tr.offsetWidth; tr.classList.add("flash"); }
  }
  // Products and Stock show the stock left after the sales made on the POS in this browser
  // Rows of every table, also the ones on other pages of the pager (those are not in the document)
  function productRows() {
    return $$("[data-table]").reduce(function (all, w) { return all.concat(w.gallaTable ? w.gallaTable.allRows() : $$("tbody tr", w)); }, []).filter(function (tr) { return tr.hasAttribute("data-sku"); });
  }
  var soldMap = Galla.stockSold();
  productRows().forEach(function (tr) {
    var sold = soldMap[tr.getAttribute("data-sku")], cell = $("[data-onhand]", tr);
    if (sold && cell) setStock(tr, Math.max(0, (parseInt(cell.getAttribute("data-value"), 10) || 0) - sold));
  });
  $$("[data-table]").forEach(function (w) { if (w.gallaTable) w.gallaTable.refresh(); });
  $$("[data-stock-form]").forEach(function (f) {
    f.addEventListener("galla:submit", function () {
      var sku = $("[name=sku]", f).value, type = $("[name=type]", f).value, q = parseInt($("[name=qty]", f).value, 10) || 0;
      var tr = productRows().filter(function (r) { return r.getAttribute("data-sku") === sku; })[0]; if (!tr) return;
      var now = parseInt($("[data-onhand]", tr).getAttribute("data-value"), 10) || 0;
      setStock(tr, type === "add" ? now + q : type === "remove" ? Math.max(0, now - q) : q, true);
    });
  });

  /* Settings: "Reset demo data" ([data-reset-demo] inside a confirm modal) */
  $$("[data-reset-demo]").forEach(function (b) {
    b.addEventListener("click", function () {
      Galla.resetDemo();
      var m = b.closest(".modal"); if (m) closeModal(m);
      toast("Demo data restored: POS sales, held sales and stock are back to the original demo");
    });
  });

  /* Settings → Store and receipt: fill the form from the saved settings, preview the receipt live, save */
  $$("[data-store-form]").forEach(function (form) {
    var fields = $$("[data-store-field]", form), preview = $("[data-store-preview]");
    var sample = { no: "R-10483", date: new Date().toISOString(), cashier: "Sana Khan", customer: "", method: "Cash", tendered: 20,
      lines: [{ name: "Cold Brew Coffee 330ml", price: 3.5, qty: 2 }, { name: "Butter Croissant", price: 1.8, qty: 3 }],
      subtotal: 12.4, discount: 0, taxRate: 8, tax: 0.99, total: 13.39 };
    function fill() {
      fields.forEach(function (f) {
        var v = G[f.getAttribute("data-store-field")]; if (v == null) return;
        // The saved currency is trimmed ("Rs"), the option value may not be ("Rs "): pick the matching option
        if (f.tagName === "SELECT") { $$("option", f).forEach(function (o) { o.selected = o.defaultSelected = o.value.trim() === String(v).trim(); }); return; }
        f.value = f.defaultValue = v;
      });
    }
    function draw() {
      if (!preview) return;
      var saved = {}; fields.forEach(function (f) { var k = f.getAttribute("data-store-field"); saved[k] = G[k]; G[k] = k === "tax" ? (parseFloat(f.value) || 0) : f.value; });
      var t = r2(sample.subtotal * G.tax / 100);
      sample.taxRate = G.tax; sample.tax = t; sample.total = r2(sample.subtotal + t); sample.tendered = Math.ceil(sample.total / 5) * 5;
      preview.innerHTML = Galla.receipt(sample);
      for (var k in saved) G[k] = saved[k];
    }
    fill(); draw();
    form.addEventListener("input", draw);
    form.addEventListener("change", draw);
    form.addEventListener("galla:submit", function () {
      var patch = {}; fields.forEach(function (f) { var k = f.getAttribute("data-store-field"); patch[k] = k === "tax" ? (parseFloat(f.value) || 0) : f.value.trim(); });
      Galla.saveConfig(patch); fill(); draw();
    });
    var reset = $("[data-store-reset]", form);
    if (reset) reset.addEventListener("click", function () {
      try { localStorage.removeItem("galla-store"); } catch (e) { /* ignore */ }
      Galla.saveConfig(DEFAULTS);
      fill(); draw(); toast("Demo store settings restored");
    });
  });

  /* Cashier PIN pad (login.html). Demo: any 4 digits open the register. */
  $$("[data-pin-pad]").forEach(function (padEl) {
    var pin = "", dots = $$("[data-pin-dots] i"), box = $("[data-pin-dots]");
    function show() {
      dots.forEach(function (d, i) { d.classList.toggle("on", i < pin.length); });
      box.setAttribute("aria-label", "PIN, " + pin.length + " of 4 digits");
      if (pin.length === 4) {
        toast("Register opened");
        var go = padEl.getAttribute("data-redirect"); setTimeout(function () { location.href = go; }, 500);
      }
    }
    function key(k) {
      if (pin.length === 4) return;
      if (k === "clear") pin = ""; else if (k === "back") pin = pin.slice(0, -1); else if (/^[0-9]$/.test(k)) pin += k;
      show();
    }
    padEl.addEventListener("click", function (e) { var b = e.target.closest("[data-pin-key]"); if (b) key(b.getAttribute("data-pin-key")); });
    document.addEventListener("keydown", function (e) {
      if (padEl.offsetParent === null || /input|select|textarea/i.test(e.target.tagName)) return;
      if (/^[0-9]$/.test(e.key)) key(e.key); else if (e.key === "Backspace") key("back");
    });
  });

  /* Mini receipt art (login.html): [data-mini-receipt] adds up its [data-line-total] lines with the store tax rate */
  $$("[data-mini-receipt]").forEach(function (r) {
    var sub = $$("[data-line-total]", r).reduce(function (a, el) { return a + Number(el.getAttribute("data-money")); }, 0);
    var tax = r2(sub * G.tax / 100);
    $$("[data-mini-tax-rate]", r).forEach(function (el) { el.textContent = G.tax; });
    $$("[data-mini-tax]", r).forEach(function (el) { el.setAttribute("data-money", tax); el.textContent = Galla.fmt(tax); });
    $$("[data-mini-total]", r).forEach(function (el) { el.setAttribute("data-money", r2(sub + tax)); el.textContent = Galla.fmt(r2(sub + tax)); });
  });

  /* Current year in footers */
  $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
