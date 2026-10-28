/*!
 * Galla POS — register screen (pos.html). Vanilla JavaScript, no dependencies.
 * Needs app.js (window.Galla) to be loaded first.
 *
 * Everything here runs in the browser: the cart, discounts, tax, payments, change and receipts.
 * Completed sales and held orders are kept in this browser's localStorage so the demo feels real.
 * Connect saveSale() to your own backend to store sales for real.
 */
(function () {
  "use strict";
  var pos = document.querySelector("[data-pos]");
  if (!pos || !window.Galla) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var G = window.Galla, fmt = G.fmt, esc = G.esc;
  var toast = window.gallaToast || function () {};
  var mem = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  /* Products come from the tiles' data-* attributes */
  var tiles = $$(".ptile", pos);
  var products = {};
  tiles.forEach(function (t) {
    products[t.dataset.id] = { id: t.dataset.id, name: t.dataset.name, price: +t.dataset.price, stock: +t.dataset.stock, cat: t.dataset.cat, sku: t.dataset.sku, barcode: t.dataset.barcode, tile: t };
  });

  // Stock already sold on this POS in this browser (localStorage "galla-stock") is taken off the tiles
  var sold = G.stockSold();
  function showTileStock(p) {
    var st = $(".st", p.tile); st.textContent = p.stock > 0 ? p.stock + " left" : "Out of stock";
    st.classList.toggle("low", p.stock > 0 && p.stock <= 10); p.tile.disabled = p.stock <= 0;
  }
  Object.keys(products).forEach(function (id) {
    var p = products[id];
    if (sold[p.sku]) { p.stock = Math.max(0, p.stock - sold[p.sku]); showTileStock(p); }
  });

  var cart = [];            // [{id, name, price, qty}]
  var discount = null;      // {type: "percent"|"amount", value}
  // Held sales from storage are kept only if they still look like held sales (old or hand-edited data is dropped)
  var heldOrders = (function (v) {
    return Array.isArray(v) ? v.filter(function (h) {
      return h && Array.isArray(h.cart) && h.cart.length && h.cart.every(function (l) { return l && products[l.id] && typeof l.qty === "number" && l.qty > 0; });
    }).map(function (h) {
      var d = h.discount && (h.discount.type === "percent" || h.discount.type === "amount") && h.discount.value > 0 ? { type: h.discount.type, value: Number(h.discount.value) } : null;
      return { at: isNaN(new Date(h.at)) ? new Date().toISOString() : h.at, cart: h.cart.map(function (l) { var p = products[l.id]; return { id: l.id, name: p.name, price: p.price, qty: Math.floor(l.qty) }; }),
        discount: d, customer: typeof h.customer === "string" ? h.customer : "", total: Number(h.total) || 0 };
    }) : [];
  })(mem.get("galla-held"));
  var lastNo = G.sales().reduce(function (m, s) { return Math.max(m, +s.no.slice(2) || 0); }, 10482);
  var saleNo = function () { return "R-" + (lastNo + 1); };

  /* ---------- Totals ---------- */
  function totals() {
    var subtotal = cart.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
    var disc = 0;
    if (discount && subtotal > 0) disc = discount.type === "percent" ? subtotal * discount.value / 100 : Math.min(discount.value, subtotal);
    var rate = Number(G.config.tax) || 0;
    // Round each part to cents first, so the lines printed on the receipt always add up to the total
    var r2 = function (v) { return Math.round((v + Number.EPSILON) * 100) / 100; };
    subtotal = r2(subtotal); disc = r2(disc);
    var tax = r2((subtotal - disc) * rate / 100);
    return { subtotal: subtotal, discount: disc, taxRate: rate, tax: tax, total: r2(subtotal - disc + tax), items: cart.reduce(function (a, l) { return a + l.qty; }, 0) };
  }

  /* ---------- Render ---------- */
  var linesBox = $("[data-cart-lines]", pos);
  function render() {
    var t = totals();
    if (!cart.length) {
      linesBox.innerHTML = '<div class="cart-empty"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg><b>No items yet</b>Tap a product or scan a barcode to start a sale.</div></div>';
    } else {
      linesBox.innerHTML = cart.map(function (l, i) {
        return '<div class="cline" data-line="' + i + '"><div><div class="nm">' + esc(l.name) + '</div><div class="unit">' + fmt(l.price) + " each</div></div>" +
          '<div class="tot">' + fmt(l.price * l.qty) + "</div>" +
          '<div class="ctrl"><div class="qty"><button type="button" data-dec aria-label="Decrease ' + esc(l.name) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>' +
          '<input type="number" inputmode="numeric" min="1" value="' + l.qty + '" aria-label="Quantity of ' + esc(l.name) + '" data-qty>' +
          '<button type="button" data-inc aria-label="Increase ' + esc(l.name) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
          '<button type="button" class="rm" data-rm aria-label="Remove ' + esc(l.name) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Remove</button></div></div>';
      }).join("");
    }
    var set = function (sel, v) { $$(sel).forEach(function (el) { el.textContent = v; }); };
    set("[data-sum-items]", t.items + (t.items === 1 ? " item" : " items"));
    set("[data-sum-subtotal]", fmt(t.subtotal));
    set("[data-sum-discount]", t.discount ? "-" + fmt(t.discount) : fmt(0));
    set("[data-sum-tax]", fmt(t.tax));
    set("[data-tax-label]", "Tax (" + t.taxRate + "%)");
    set("[data-sum-total]", fmt(t.total));
    set("[data-bar-count]", t.items);
    set("[data-discount-btn]", discount ? (discount.type === "percent" ? discount.value + "% off · Edit" : "Edit") : "Add");
    $$("[data-pos-pay], [data-pos-hold], [data-pos-clear]").forEach(function (b) { b.disabled = !cart.length; });
    // Badge on tiles showing how many are in the cart
    tiles.forEach(function (tile) {
      var line = cart.filter(function (l) { return l.id === tile.dataset.id; })[0], badge = $(".in-cart", tile);
      if (line) { if (!badge) { badge = document.createElement("span"); badge.className = "in-cart"; tile.appendChild(badge); } badge.textContent = line.qty; }
      else if (badge) badge.remove();
    });
    var hc = $("[data-held-count]"); if (hc) { hc.textContent = heldOrders.length; hc.hidden = !heldOrders.length; }
  }

  /* ---------- Cart actions ---------- */
  function add(id, qty) {
    var p = products[id]; if (!p) return;
    var line = cart.filter(function (l) { return l.id === id; })[0];
    var want = (line ? line.qty : 0) + (qty || 1);
    if (want > p.stock) { toast(p.stock > 0 ? "Only " + p.stock + " " + p.name + " left in stock" : p.name + " is out of stock"); return; }
    if (line) line.qty = want; else cart.push({ id: id, name: p.name, price: p.price, qty: qty || 1 });
    p.tile.classList.remove("bump"); void p.tile.offsetWidth; p.tile.classList.add("bump");
    render();
  }
  function setQty(i, q) {
    var l = cart[i]; if (!l) return;
    q = Math.floor(Number(q) || 0);
    if (q <= 0) { cart.splice(i, 1); render(); return; }
    var max = products[l.id].stock;
    if (q > max) { q = max; toast("Only " + max + " in stock"); }
    l.qty = q; render();
  }
  pos.addEventListener("click", function (e) {
    var tile = e.target.closest(".ptile");
    if (tile && !tile.disabled) { add(tile.dataset.id, 1); return; }
    var line = e.target.closest("[data-line]"); if (!line) return;
    var i = +line.dataset.line;
    if (e.target.closest("[data-inc]")) setQty(i, cart[i].qty + 1);
    else if (e.target.closest("[data-dec]")) setQty(i, cart[i].qty - 1);
    else if (e.target.closest("[data-rm]")) setQty(i, 0);
  });
  linesBox.addEventListener("change", function (e) {
    if (!e.target.matches("[data-qty]")) return;
    // An empty or unreadable quantity puts the old one back; 0 removes the line
    if (e.target.value.trim() === "" || isNaN(Number(e.target.value))) { render(); return; }
    setQty(+e.target.closest("[data-line]").dataset.line, e.target.value);
  });

  /* ---------- Search, barcode and category filter ---------- */
  var search = $("[data-pos-search]"), activeCat = "", empty = $("[data-pos-empty]");
  function filter() {
    var q = (search.value || "").trim().toLowerCase(), shown = 0;
    tiles.forEach(function (t) {
      var p = products[t.dataset.id];
      var ok = (!activeCat || p.cat === activeCat) && (!q || (p.name + " " + p.sku + " " + p.barcode).toLowerCase().indexOf(q) > -1);
      t.hidden = !ok; if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    return shown;
  }
  search.addEventListener("input", filter);
  search.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    var q = search.value.trim().toLowerCase(); if (!q) return;
    // Exact barcode or SKU (what a scanner types), otherwise the only product left in the list
    var exact = Object.keys(products).filter(function (id) { var p = products[id]; return p.barcode === q || p.sku.toLowerCase() === q; })[0];
    var visible = tiles.filter(function (t) { return !t.hidden && !t.disabled; });
    var id = exact || (visible.length === 1 ? visible[0].dataset.id : null);
    if (id) { add(id, 1); search.value = ""; filter(); }
    else toast(visible.length ? "Several products match. Tap the one you want." : "No product with that name, SKU or barcode");
  });
  $$("[data-cat]", $(".chips", pos)).forEach(function (chip) {
    chip.addEventListener("click", function () {
      activeCat = chip.getAttribute("data-cat");
      $$(".chip", pos).forEach(function (c) { c.setAttribute("aria-pressed", c === chip); });
      filter();
    });
  });
  document.addEventListener("keydown", function (e) {
    // Shortcuts are ignored while a window (payment, discount …) is open, so focus stays inside it
    if (document.querySelector(".modal.open")) return;
    if (e.key === "F2") { e.preventDefault(); closeSheet(); search.focus(); search.select(); }
    if (e.key === "F9" && cart.length) { e.preventDefault(); openPay(); }
  });

  /* ---------- Customer ---------- */
  var customerSel = $("[data-pos-customer]");

  /* ---------- Discount ---------- */
  var dType = "percent", discInput = $("#disc-value");
  function setDiscType(type) {
    dType = type;
    $$("[data-discount-type]").forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-discount-type") === type); });
    $("[data-discount-unit]").textContent = type === "percent" ? "%" : G.symbol().trim();
  }
  $$("[data-discount-type]").forEach(function (b) {
    b.addEventListener("click", function () { setDiscType(b.getAttribute("data-discount-type")); });
  });
  // Opening the window shows the discount already on the sale (or an empty field) instead of the last typed value
  $$("[data-modal-open='discount']").forEach(function (b) {
    b.addEventListener("click", function () {
      setDiscType(discount ? discount.type : "percent");
      discInput.value = discount ? discount.value : "";
      discInput.classList.remove("is-invalid"); discInput.removeAttribute("aria-invalid");
    });
  });
  discInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); $("[data-discount-apply]").click(); } });
  $$("[data-discount-quick]").forEach(function (b) {
    b.addEventListener("click", function () { setDiscType("percent"); discInput.value = b.getAttribute("data-discount-quick"); discInput.classList.remove("is-invalid"); discInput.removeAttribute("aria-invalid"); });
  });
  $("[data-discount-apply]").addEventListener("click", function () {
    var input = discInput, v = parseFloat(String(input.value).replace(",", "."));
    var bad = !(v > 0) || (dType === "percent" && v > 100);
    input.classList.toggle("is-invalid", bad); input.setAttribute("aria-invalid", bad);
    if (bad) { input.focus(); return; }
    discount = { type: dType, value: v };
    closeModal("discount"); render();
    toast("Discount applied: " + (dType === "percent" ? v + "%" : fmt(v)));
  });
  $("[data-discount-remove]").addEventListener("click", function () { discount = null; closeModal("discount"); render(); });

  /* ---------- Hold / clear ---------- */
  function resetSale() {
    cart = []; discount = null; customerSel.value = "";
    $$("[data-sale-no]").forEach(function (el) { el.textContent = "#" + saleNo(); });
    render();
  }
  $("[data-pos-clear]").addEventListener("click", function () {
    if (!cart.length) return;
    resetSale(); toast("Sale cleared");
  });
  $("[data-pos-hold]").addEventListener("click", function () {
    if (!cart.length) return;
    heldOrders.unshift({ at: new Date().toISOString(), cart: cart, discount: discount, customer: customerSel.value, total: totals().total });
    mem.set("galla-held", heldOrders);
    resetSale(); toast("Sale put on hold. Find it under Held.");
  });
  function renderHeld() {
    var box = $("[data-held-list]");
    if (!heldOrders.length) { box.innerHTML = '<p class="muted text-center" style="padding:24px 0;margin:0">No sales on hold.</p>'; return; }
    box.innerHTML = '<ul class="list">' + heldOrders.map(function (h, i) {
      var n = h.cart.reduce(function (a, l) { return a + l.qty; }, 0), d = new Date(h.at);
      return '<li><div><b class="strong">' + esc(h.customer || "Walk-in customer") + '</b><div class="small muted">' + n + " items · held at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + "</div></div>" +
        '<div class="flex items-center gap-8"><b class="mono">' + fmt(h.total) + '</b><button class="btn btn-sm" type="button" data-resume="' + i + '">Resume</button><button class="icon-btn" type="button" data-drop="' + i + '" aria-label="Delete held sale"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></li>';
    }).join("") + "</ul>";
  }
  $$("[data-modal-open='held-orders']").forEach(function (b) { b.addEventListener("click", renderHeld); });
  $("[data-held-list]").addEventListener("click", function (e) {
    var r = e.target.closest("[data-resume]"), d = e.target.closest("[data-drop]");
    if (r) {
      if (cart.length) { toast("Finish or hold the current sale first"); return; }
      var h = heldOrders.splice(+r.dataset.resume, 1)[0];
      // Stock may have been sold since the sale was held: lower quantities to what is left
      var changed = [];
      cart = h.cart.filter(function (l) {
        var left = products[l.id].stock;
        if (l.qty > left) { changed.push(left > 0 ? l.name + " (only " + left + " left)" : l.name + " (out of stock)"); l.qty = left; }
        return l.qty > 0;
      });
      discount = h.discount;
      customerSel.value = $$("option", customerSel).some(function (o) { return o.value === h.customer; }) ? h.customer : "";
      mem.set("galla-held", heldOrders); closeModal("held-orders"); render();
      toast(changed.length ? "Held sale resumed. Changed to match stock: " + changed.join(", ") : "Held sale resumed");
    } else if (d) {
      heldOrders.splice(+d.dataset.drop, 1); mem.set("galla-held", heldOrders); renderHeld(); render();
    }
  });

  /* ---------- Payment ---------- */
  var method = "Cash", tendered = $("#pay-tendered");
  function openModal(id) { window.gallaOpenModal(id); }
  function closeModal(id) { window.gallaCloseModal(document.getElementById(id)); }
  function quickCash(total) {
    var c = G.symbol(), opts = [total], steps = [5, 10, 20, 50, 100, 500, 1000, 5000];
    steps.forEach(function (s) { var v = Math.ceil(total / s) * s; if (v > total && opts.indexOf(v) < 0 && opts.length < 4) opts.push(v); });
    $("[data-quick-cash]").innerHTML = opts.map(function (v, i) { return '<button type="button" data-cash="' + v + '">' + (i === 0 ? "Exact" : esc(c) + v) + "</button>"; }).join("");
  }
  function updateChange() {
    var t = totals(), box = $("[data-change]"), btn = $("[data-pay-complete]");
    if (method !== "Cash") { box.hidden = true; btn.disabled = false; return; }
    var v = parseFloat(String(tendered.value).replace(/,/g, "")) || 0, diff = Math.round((v - t.total) * 100) / 100;
    box.hidden = !tendered.value;
    box.classList.toggle("short", diff < 0);
    $("[data-change-label]").textContent = diff < 0 ? "Still due" : "Change to give";
    $("[data-change-value]").textContent = fmt(Math.abs(diff));
    btn.disabled = diff < 0;
  }
  function openPay() {
    if (!cart.length) return;
    var t = totals();
    $("[data-pay-due]").textContent = fmt(t.total);
    tendered.value = ""; quickCash(t.total); updateChange();
    $("[data-pay-complete]").disabled = method === "Cash";
    openModal("payment");
    setTimeout(function () { if (method === "Cash") tendered.focus(); }, 60);
  }
  $$("[data-pos-pay]").forEach(function (b) { b.addEventListener("click", openPay); });
  $$("[data-method]").forEach(function (b) {
    b.addEventListener("click", function () {
      method = b.getAttribute("data-method");
      $$("[data-method]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      $("[data-cash-fields]").hidden = method !== "Cash";
      $("[data-card-note]").hidden = method === "Cash";
      $("[data-card-note-text]").textContent = method === "Card" ? "Ask the customer to tap, insert or swipe their card on the card machine, then confirm here." : "Show your shop's payment QR code. Confirm here once the transfer appears.";
      updateChange();
    });
  });
  tendered.addEventListener("input", updateChange);
  tendered.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); $("[data-pay-complete]").click(); } });
  $("[data-quick-cash]").addEventListener("click", function (e) { var b = e.target.closest("[data-cash]"); if (b) { tendered.value = b.dataset.cash; updateChange(); } });

  var lastSale = null;
  function saveSale(sale) { G.addSale(sale); }   // connect to your backend here
  $("[data-pay-complete]").addEventListener("click", function () {
    if (this.disabled || !cart.length) return;
    var t = totals(), opt = customerSel.options[customerSel.selectedIndex];
    var sale = {
      no: saleNo(), date: new Date().toISOString(), cashier: "Sana Khan", customer: customerSel.value ? opt.textContent : "",
      method: method, tendered: method === "Cash" ? (parseFloat(String(tendered.value).replace(/,/g, "")) || t.total) : t.total,
      lines: cart.map(function (l) { return { name: l.name, price: l.price, qty: l.qty }; }),
      subtotal: t.subtotal, discount: t.discount, taxRate: t.taxRate, tax: t.tax, total: t.total
    };
    saveSale(sale); lastSale = sale; lastNo++;
    // Lower the stock on the tiles and remember it (localStorage "galla-stock"), so it stays lower after a reload
    G.recordSold(cart.map(function (l) { return { sku: products[l.id].sku, qty: l.qty }; }));
    cart.forEach(function (l) { var p = products[l.id]; p.stock = Math.max(0, p.stock - l.qty); showTileStock(p); });
    closeModal("payment"); closeSheet(false);
    $("[data-receipt]").innerHTML = G.receipt(sale);
    $$("[data-receipt-title]").forEach(function (el) { el.textContent = "Sale complete · " + sale.no; });
    $$("[data-view-receipt]").forEach(function (a) { a.href = "receipt.html?no=" + encodeURIComponent(sale.no); });
    openModal("receipt-modal");
    resetSale();
  });
  $("[data-print-last]").addEventListener("click", function () { if (lastSale) G.printReceipt(G.receipt(lastSale)); });
  $("[data-new-sale]").addEventListener("click", function () { closeModal("receipt-modal"); search.focus(); });

  /* ---------- Mobile cart sheet ---------- */
  var root = document.documentElement, cartBar = $("[data-cart-open]");
  function closeSheet(refocus) {
    if (!root.classList.contains("cart-open")) return;
    root.classList.remove("cart-open");
    if (refocus !== false && cartBar && getComputedStyle(cartBar).display !== "none") cartBar.focus();
  }
  $$("[data-cart-open]").forEach(function (b) {
    b.addEventListener("click", function () {
      root.classList.add("cart-open");
      var c = $(".cart-close", pos); if (c) setTimeout(function () { c.focus(); }, 60);
    });
  });
  $$("[data-cart-close]").forEach(function (b) { b.addEventListener("click", function () { closeSheet(); }); });
  // Esc closes the sheet, unless a window is open on top of it (then Esc closes only that window)
  window.addEventListener("keydown", function (e) { if (e.key === "Escape" && !document.querySelector(".modal.open")) closeSheet(); }, true);

  $$("[data-sale-no]").forEach(function (el) { el.textContent = "#" + saleNo(); });
  render();
})();
