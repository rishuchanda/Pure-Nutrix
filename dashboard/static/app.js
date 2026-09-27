/* PureNutrix Dashboard — plain JS, no build step. */
(() => {
  "use strict";

  const PLATS = ["amazon", "flipkart", "meesho"];
  const PNAME = { amazon: "Amazon", flipkart: "Flipkart", meesho: "Meesho" };
  const TABS = [
    ["home", "🏠 Aaj"], ["orders", "📦 Orders"], ["returns", "↩️ Returns"], ["money", "💰 Paisa"],
    ["stock", "📊 Stock"], ["products", "🏆 Products"], ["ads", "📣 Ads"], ["reviews", "⭐ Reviews"],
    ["competitors", "🏷️ Competitors"], ["cash", "🏦 Cash flow"], ["report", "📝 Report"], ["data", "⚙️ Data"],
  ];
  const PERIODS = [["today", "Aaj"], ["yesterday", "Kal"], ["7d", "7 din"], ["30d", "30 din"], ["mtd", "Is mahina"], ["lastmonth", "Pichhla mahina"]];

  const store = {
    get(k, d) { try { return localStorage.getItem("pn." + k) || d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("pn." + k, v); } catch (e) { /* private mode */ } },
  };
  const S = {
    tab: (location.hash || "#home").slice(1),
    period: store.get("period", "today"),
    longPeriod: store.get("longPeriod", "30d"),
    finPlat: "total",
    reportKind: "week",
  };
  if (!TABS.some(t => t[0] === S.tab)) S.tab = "home";
  const view = document.getElementById("view");

  // ---------- helpers ----------
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function inr(n, { sign = false } = {}) {
    if (n == null || isNaN(n)) return "—";
    const neg = n < 0; const v = Math.round(Math.abs(n));
    const s = v.toLocaleString("en-IN");
    return (neg ? "−₹" : (sign && n > 0 ? "+₹" : "₹")) + s;
  }
  function inrShort(n) {
    if (n == null) return "—";
    const a = Math.abs(n), neg = n < 0 ? "−" : "";
    if (a >= 1e7) return neg + "₹" + (a / 1e7).toFixed(2) + " Cr";
    if (a >= 1e5) return neg + "₹" + (a / 1e5).toFixed(2) + " L";
    if (a >= 1e3) return neg + "₹" + (a / 1e3).toFixed(1) + "k";
    return neg + "₹" + Math.round(a);
  }
  const num = n => (n == null ? "—" : Number(n).toLocaleString("en-IN"));
  const pct = n => (n == null ? "—" : n + "%");
  function when(iso) {
    if (!iso) return "kabhi nahi";
    const d = new Date(iso), now = new Date();
    const hrs = (now - d) / 36e5;
    const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    if (hrs < 24 && d.getDate() === now.getDate()) return "aaj " + t;
    if (hrs < 48) return "kal " + t;
    return Math.floor(hrs / 24) + " din pehle";
  }
  const dayLabel = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  function delta(change, goodWhenUp = true, suffix = "") {
    if (change == null) return `<span class="delta flat">pichhle se tulna nahi</span>`;
    if (Math.abs(change) < 3) return `<span class="delta flat">● lagbhag same${suffix}</span>`;
    const up = change > 0, good = up === goodWhenUp;
    return `<span class="delta ${good ? "good" : "bad"}">${up ? "▲" : "▼"} ${Math.abs(change)}%${suffix}</span>`;
  }
  const statusPill = (level, text) => {
    const icon = { good: "✓", watch: "⚠", bad: "✕" }[level] || "";
    return `<span class="pill ${level}">${icon} ${esc(text)}</span>`;
  };

  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
    el.textContent = msg; el.style.display = "block";
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.style.display = "none"), 3500);
  }

  async function api(path, opts = {}) {
    const init = { credentials: "same-origin", ...opts };
    if (opts.json !== undefined) {
      init.method = opts.method || "POST";
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(opts.json);
    }
    const r = await fetch(path, init);
    if (r.status === 401) { location.href = "/login"; throw new Error("login"); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || "Kuch gadbad hui");
    return data;
  }

  function periodChips(key = "period", options = PERIODS) {
    return `<div class="periods" role="group" aria-label="Samay">${options.map(([k, l]) =>
      `<button class="chip" data-period-key="${key}" data-period="${k}" aria-pressed="${S[key] === k}">${l}</button>`).join("")}</div>`;
  }
  const LONG = PERIODS.filter(p => p[0] !== "today" && p[0] !== "yesterday");

  // ---------- tabs ----------
  const tabsEl = document.getElementById("tabs");
  tabsEl.innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${l}</button>`).join("");
  tabsEl.addEventListener("click", e => {
    const b = e.target.closest("[data-tab]"); if (!b) return;
    location.hash = b.dataset.tab;
  });
  window.addEventListener("hashchange", () => {
    S.tab = (location.hash || "#home").slice(1);
    tabsEl.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.tab === S.tab));
    const active = tabsEl.querySelector(`[data-tab="${S.tab}"]`);
    if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    render();
  });
  document.getElementById("refresh").addEventListener("click", () => render());

  view.addEventListener("click", e => {
    const p = e.target.closest("[data-period]");
    if (p) {
      S[p.dataset.periodKey] = p.dataset.period;
      store.set(p.dataset.periodKey, p.dataset.period);
      render();
    }
  });

  async function render() {
    const fn = RENDER[S.tab] || RENDER.home;
    view.classList.add("loading");
    try { await fn(); }
    catch (err) {
      if (err.message !== "login") view.innerHTML = `<div class="card empty">⚠️ ${esc(err.message)}<br><button class="btn secondary small" onclick="location.reload()">Dobara try karo</button></div>`;
    } finally { view.classList.remove("loading"); }
  }

  // ---------- shared blocks ----------
  function demoBanner(isDemo) {
    return isDemo ? `<div class="demo-banner">🧪 <b>DEMO data</b> dikh raha hai (asli nahi). Asli data jodne ke liye <a href="#data">⚙️ Data</a> par jao.</div>` : "";
  }

  function alertList(items) {
    if (!items || !items.length) return "";
    return items.map(a => `
      <div class="alert ${a.severity}" role="alert">
        <span class="ico" aria-hidden="true">${a.severity === "critical" ? "🔴" : "🟡"}</span>
        <div><div class="t">${esc(a.title)}</div><div class="m">${esc(a.message)}</div></div>
        <button class="x" data-resolve="${a.id}" aria-label="Hatao">✕</button>
      </div>`).join("");
  }
  view.addEventListener("click", async e => {
    const b = e.target.closest("[data-resolve]"); if (!b) return;
    await api(`/api/alerts/${b.dataset.resolve}/resolve`, { method: "POST" });
    b.closest(".alert").remove();
  });

  function freshnessList(fr) {
    return PLATS.map(p => {
      const f = fr[p] || {};
      let level = "good", text = "Data fresh — " + when(f.last_ok);
      if (f.last_status === "error") { level = "bad"; text = "Data nahi aaya — Data tab dekho"; }
      else if (!f.last_ok) { level = "watch"; text = "Abhi tak juda nahi"; }
      else if (f.stale) { level = "watch"; text = "Purana data (" + when(f.last_ok) + ") — nayi file daalo"; }
      return `<div class="kv"><span class="plat-name"><span class="dot ${p}"></span>${PNAME[p]}</span>${statusPill(level, text)}</div>`;
    }).join("");
  }

  // ---------- HOME ----------
  function auditCard(runs, full = false) {
    if (!runs || !runs.length) return `<div class="card"><div class="stat-label">🤖 n8n ki roz ki jaanch</div><p class="hint" style="margin:6px 0 0">Abhi tak koi jaanch nahi hui. Roz subah n8n seller panels padh kar yahan data bhejega.</p></div>`;
    const r = runs[0];
    const lvl = r.status === "problem" ? "bad" : r.status === "fixed" ? "watch" : "good";
    const label = { ok: "Sab mila", fixed: "Kami thi — theek kar di", problem: "Dhyaan do" }[r.status] || r.status;
    const icon = { ok: "✓", fixed: "🔧", mismatch: "⚠", unreadable: "✕" };
    const checks = r.checks.map(c => `<div class="kv" style="flex-wrap:wrap"><span>${icon[c.status] || ""} ${c.platform ? `<span class="dot ${esc(c.platform)}"></span>` : ""}${esc(c.item || "")}</span>
      <span class="stat-sub" style="text-align:right">${c.panel != null ? "panel: " + esc(c.panel) : ""}${c.dashboard != null ? " · dashboard: " + esc(c.dashboard) : ""}</span>
      ${c.note ? `<div class="stat-sub" style="flex-basis:100%">${esc(c.note)}</div>` : ""}</div>`).join("");
    const saved = Object.entries(r.saved || {}).filter(([k, v]) => k !== "errors" && v).map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(", ");
    return `<div class="card status-${lvl}">
      <div class="stat-label">🤖 n8n ki roz ki jaanch · ${when(r.created_at)}</div>
      <div style="margin:6px 0">${statusPill(lvl, label)} <span class="stat-sub">${dayLabel(r.day)} ka data</span></div>
      ${r.summary ? `<div style="font-size:15px">${esc(r.summary)}</div>` : ""}
      ${saved ? `<div class="stat-sub" style="margin-top:4px">Joda / update kiya: ${esc(saved)}</div>` : ""}
      ${checks ? (full ? `<div style="margin-top:8px">${checks}</div>` : `<details style="margin-top:8px"><summary>${r.checks.length} cheezein check ki</summary>${checks}</details>`) : ""}
    </div>`;
  }

  async function renderHome() {
    const [d, au] = await Promise.all([api(`/api/summary?period=${S.period}`), api("/api/audit")]);
    const t = d.finance.total, r = d.returns.all;
    // A single day is too small to judge returns; below a week show the last-7-days rate.
    const shortPeriod = d.period.days < 7;
    const retRate = shortPeriod ? d.spikes.all.recent : r.rate;
    const retLevel = retRate == null ? "muted" : (d.spikes.all.spike ? "bad" : (d.spikes.all.trend === "up" ? "watch" : "good"));
    // Profit is only trustworthy once purchase costs and fee history exist - say so loudly otherwise.
    const noCost = d.inventory_totals.units_without_cost > 0;
    const incomplete = noCost || t.no_fee_history;
    const profitLevel = incomplete ? "watch" : t.profit < 0 ? "bad" : (t.margin_pct != null && t.margin_pct < 10 ? "watch" : "good");
    const feeNote = incomplete
      ? `<div style="margin-top:6px">${statusPill("watch", "Adhoora number")}</div><div class="stat-sub">${noCost ? "Maal ki keemat nahi daali (📊 Stock → Naya maal aaya). " : ""}${t.no_fee_history ? "Fees ka data abhi nahi aaya." : ""}</div>`
      : (t.estimated_lines ? `<div class="stat-sub">${t.estimated_lines} order ki fees abhi andaza hai</div>` : "");
    view.innerHTML = `
      ${demoBanner(d.demo)}
      ${periodChips()}
      <div class="grid four">
        <div class="card"><div class="stat-label">📦 Orders</div>
          <div class="big xl">${num(t.orders)}</div>${delta(d.compare.orders)}
          <div class="stat-sub">${num(t.units)} units · pehle ${num(d.compare.prev.orders)}</div></div>
        <div class="card"><div class="stat-label">💰 Bikri</div>
          <div class="big">${inr(t.net_sale)}</div>${delta(d.compare.net_sale)}
          <div class="stat-sub">return hataake</div></div>
        <div class="card status-${profitLevel}"><div class="stat-label">✅ Asli Munafa</div>
          <div class="big">${inr(t.profit)}</div>${delta(d.compare.profit)}
          <div class="stat-sub">${incomplete ? "" : (t.margin_pct == null ? "" : t.margin_pct + "% margin · ") + "sab kharch ke baad"}</div>${feeNote}</div>
        <div class="card ${retLevel === "muted" ? "" : "status-" + retLevel}"><div class="stat-label">↩️ Return + RTO</div>
          <div class="big">${pct(retRate)}</div>
          ${retLevel === "muted" ? "" : statusPill(retLevel, retLevel === "bad" ? "Bahut zyada" : retLevel === "watch" ? "Badh raha" : "Theek hai")}
          <div class="stat-sub">${shortPeriod ? "pichhle 7 din ka · normal " + pct(d.spikes.all.normal) : num(r.customer) + " customer · " + num(r.rto) + " RTO"}</div></div>
      </div>

      ${d.alerts.length ? `<h2 class="section">🔔 Dhyaan do (${d.alerts.length})</h2>${alertList(d.alerts)}` : ""}

      <h2 class="section">Platform ke hisaab se · ${esc(d.period.label)}</h2>
      <div class="grid three">
        ${PLATS.map(p => {
          const f = d.finance.platforms[p], rr = d.returns[p], sp = d.spikes[p];
          return `<div class="card">
            <div class="plat-name"><span class="dot ${p}"></span>${PNAME[p]}</div>
            <div class="big">${num(f.orders)} <span style="font-size:15px;font-weight:600;color:var(--muted)">orders</span></div>
            <div class="kv"><span>Bikri</span><b>${inr(f.net_sale)}</b></div>
            <div class="kv"><span>Munafa</span><b class="${f.profit < 0 ? "danger" : ""}">${f.live ? "kal report ke baad" : inr(f.profit)}</b></div>
            ${f.live ? `<div class="stat-sub" style="margin-top:4px">📡 Panel par aaj: ${num(f.live.units)} units · ${inr(f.live.sales)} grahak wali keemat (${when(f.live.captured_at)})${f.live.new_orders != null ? " · " + num(f.live.new_orders) + " order bhejne baaki" : ""}. Bikri = jo aapko milega.</div>` : ""}
            ${p === "flipkart" && !f.live && f.net_sale ? `<div class="stat-sub" style="margin-top:4px">Bikri = Flipkart ka Sale Amount (jo aapko milta hai). Panel ki "Sales" me Flipkart ki shipping bhi judi hoti hai, isliye wo zyada dikhti hai.</div>` : ""}
            <div class="kv"><span>Return/RTO${shortPeriod ? " (7 din)" : ""}</span><b>${pct(shortPeriod ? sp.recent : rr.rate)} ${sp.spike ? "🔴" : ""}</b></div>
          </div>`;
        }).join("")}
      </div>

      ${d.stock_alerts.length ? `<h2 class="section">📉 Stock kam hai</h2><div class="card">${d.stock_alerts.map(s => `
        <div class="item"><div class="main"><div class="name">${esc(s.name)}</div>
        <div class="meta">${s.days_left == null ? "" : "lagbhag " + Math.floor(s.days_left) + " din ka bacha · "}${s.per_day}/din bik raha</div></div>
        <div class="num">${num(s.stock)} units<br>${statusPill(s.level, s.level === "bad" ? "Turant mangwao" : "Jaldi mangwao")}</div></div>`).join("")}</div>` : ""}

      <h2 class="section">🔄 Data kab aaya</h2>
      <div class="card">${freshnessList(d.freshness)}</div>
      <div style="margin-top:12px">${auditCard(au.items)}</div>`;
  }

  // ---------- ORDERS ----------
  function stackedBars(days, series, key, fmt, W = 720) {
    const H = W < 500 ? 200 : 240, padL = 44, padB = 26, padT = 10;
    const n = days.length, cw = (W - padL) / n, bw = Math.max(2, Math.min(22, cw - 2));
    const totals = days.map((_, i) => PLATS.reduce((s, p) => s + (series[p][i][key] || 0), 0));
    const max = Math.max(1, ...totals);
    const step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    const y = v => padT + (H - padT - padB) * (1 - v / top);
    let g = "";
    for (let v = 0; v <= top; v += step) {
      g += `<line x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>`;
      g += `<text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${fmt(v)}</text>`;
    }
    let bars = "";
    days.forEach((dday, i) => {
      let acc = 0; const x = padL + i * cw + (cw - bw) / 2;
      const segs = PLATS.filter(p => series[p][i][key] > 0);
      segs.forEach((p, j) => {
        const v = series[p][i][key]; const y0 = y(acc), y1 = y(acc + v);
        const h = Math.max(0, y0 - y1 - (j < segs.length - 1 ? 2 : 0));  // 2px gap between stacked segments
        const r = j === segs.length - 1 ? Math.min(4, bw / 2, h) : 0;
        bars += r ? `<path d="M${x},${y1 + h} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y1 + h} Z" fill="var(--${p})"/>`
                  : `<rect x="${x}" y="${y1}" width="${bw}" height="${h}" fill="var(--${p})"/>`;
        acc += v;
      });
      const every = Math.ceil(n / Math.max(2, Math.floor((W - padL) / 64)));
      if ((n - 1 - i) % every === 0)  // label counts back from today so the latest day is always labelled
        bars += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--muted)">${dayLabel(dday)}</text>`;
      bars += `<rect class="hit" data-i="${i}" x="${padL + i * cw}" y="${padT}" width="${cw}" height="${H - padT - padB}" fill="transparent"/>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Rozana ${key} chart">${g}<line x1="${padL}" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line-strong)"/>${bars}</svg>`;
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9)))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  function attachTooltip(wrap, days, series, key, fmt) {
    const tip = wrap.querySelector(".tooltip"), svg = wrap.querySelector("svg");
    const show = (i, evt) => {
      const tot = PLATS.reduce((s, p) => s + series[p][i][key], 0);
      tip.innerHTML = `<div style="font-weight:700;margin-bottom:4px">${dayLabel(days[i])}</div>` +
        PLATS.map(p => `<div class="tt-row"><span><span class="dot ${p}"></span>${PNAME[p]}</span><b>${fmt(series[p][i][key])}</b></div>`).join("") +
        `<div class="tt-row" style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>Total</span><b>${fmt(tot)}</b></div>`;
      tip.style.display = "block";
      const rect = wrap.getBoundingClientRect();
      const x = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
      tip.style.left = Math.max(0, Math.min(rect.width - tip.offsetWidth, x - tip.offsetWidth / 2)) + "px";
      tip.style.top = "-8px";
      svg.querySelectorAll(".hit").forEach(h => h.setAttribute("fill", h.dataset.i == i ? "rgba(128,128,128,.10)" : "transparent"));
    };
    svg.querySelectorAll(".hit").forEach(h => {
      h.addEventListener("mousemove", e => show(+h.dataset.i, e));
      h.addEventListener("click", e => show(+h.dataset.i, e));
    });
    wrap.addEventListener("mouseleave", () => { tip.style.display = "none"; svg.querySelectorAll(".hit").forEach(h => h.setAttribute("fill", "transparent")); });
  }

  async function renderOrders() {
    const days = S.longPeriod === "7d" ? 7 : S.longPeriod === "mtd" ? Math.max(7, new Date().getDate()) : 30;
    const [tr, sm] = await Promise.all([api(`/api/trend?days=${days}`), api(`/api/summary?period=${S.longPeriod}`)]);
    const legend = `<div class="legend">${PLATS.map(p => `<span><span class="dot ${p}"></span>${PNAME[p]}</span>`).join("")}</div>`;
    view.innerHTML = `
      ${demoBanner(sm.demo)}
      ${periodChips("longPeriod", LONG)}
      <h2 class="section">Rozana orders</h2>
      <div class="card">${legend}<div class="chart-wrap" id="c1"><div class="tooltip"></div></div></div>
      <h2 class="section">Rozana bikri (₹)</h2>
      <div class="card">${legend}<div class="chart-wrap" id="c2"><div class="tooltip"></div></div></div>
      <h2 class="section">${esc(sm.period.label)} — total</h2>
      <div class="card table-scroll"><table class="simple">
        <tr><th>Platform</th><th class="n">Orders</th><th class="n">Units</th><th class="n">Cancel</th><th class="n">Bikri</th></tr>
        ${PLATS.map(p => { const f = sm.finance.platforms[p], rr = sm.returns[p]; return `<tr><td><span class="dot ${p}"></span>${PNAME[p]}</td><td class="n">${num(f.orders)}</td><td class="n">${num(f.units)}</td><td class="n">${num(rr.cancelled)}</td><td class="n">${inr(f.net_sale)}</td></tr>`; }).join("")}
        <tr><td><b>Total</b></td><td class="n"><b>${num(sm.finance.total.orders)}</b></td><td class="n"><b>${num(sm.finance.total.units)}</b></td><td class="n"><b>${num(sm.returns.all.cancelled)}</b></td><td class="n"><b>${inr(sm.finance.total.net_sale)}</b></td></tr>
      </table></div>`;
    const drawCharts = () => {
      [["c1", "orders", v => num(v), v => num(v)], ["c2", "sales", inrShort, v => inr(v)]].forEach(([id, key, axisFmt, tipFmt]) => {
        const wrap = document.getElementById(id); if (!wrap) return;
        const W = Math.max(280, Math.floor(wrap.clientWidth));
        wrap.querySelector("svg")?.remove();
        wrap.insertAdjacentHTML("afterbegin", stackedBars(tr.days, tr.platforms, key, axisFmt, W));
        attachTooltip(wrap, tr.days, tr.platforms, key, tipFmt);
      });
    };
    drawCharts();
    window.onresize = () => { if (S.tab === "orders") drawCharts(); };
  }

  // ---------- RETURNS ----------
  async function renderReturns() {
    const d = await api(`/api/returns?period=${S.longPeriod}`);
    view.innerHTML = `
      ${periodChips("longPeriod", LONG)}
      <p class="hint">RTO = courier customer tak pahuncha nahi, maal wapas aaya. Customer return = customer ne lene ke baad wapas bheja.</p>
      <div class="grid three">
        ${PLATS.map(p => {
          const s = d.stats[p], sp = d.spikes[p];
          const lvl = sp.spike ? "bad" : sp.trend === "up" ? "watch" : "good";
          const trendTxt = sp.recent == null ? "Data kam hai" : sp.spike ? "Achanak badh gaya" : sp.trend === "up" ? "Badh raha hai" : sp.trend === "down" ? "Kam ho raha hai" : "Normal";
          return `<div class="card status-${s.rate == null ? "good" : lvl}">
            <div class="plat-name"><span class="dot ${p}"></span>${PNAME[p]}</div>
            <div class="big">${pct(s.rate)}</div>
            ${s.rate == null ? "" : statusPill(lvl, trendTxt)}
            <div class="kv" style="margin-top:8px"><span>Customer return</span><b>${num(s.customer)}</b></div>
            <div class="kv"><span>RTO</span><b>${num(s.rto)}</b></div>
            <div class="kv"><span>Cancel</span><b>${num(s.cancelled)}</b></div>
            <div class="stat-sub">Pichhle 7 din: ${pct(sp.recent)} · normal: ${pct(sp.normal)}</div>
          </div>`;
        }).join("")}
      </div>
      <h2 class="section">Sabse zyada wapas aane wale products</h2>
      <div class="card">${d.by_sku.length ? d.by_sku.map((s, i) => `
        <div class="item"><div class="rank">${i + 1}</div><div class="main"><div class="name">${esc(s.name)}</div>
        <div class="meta">${num(s.customer)} customer · ${num(s.rto)} RTO</div></div><div class="num">${num(s.n)}</div></div>`).join("") : `<div class="empty">Koi return nahi 🎉</div>`}</div>
      <h2 class="section">Return ki wajah</h2>
      <div class="card">${d.reasons.length ? d.reasons.map(r => `
        <div class="item"><div class="main"><div class="name">${esc(r.reason)}</div>
        <div class="meta"><span class="dot ${esc(r.platform)}"></span>${PNAME[r.platform] || esc(r.platform)} · ${r.return_type === "rto" ? "RTO" : "Customer"}</div></div><div class="num">${num(r.n)}</div></div>`).join("") : `<div class="empty">Wajah ka data nahi (returns report upload karo)</div>`}</div>`;
  }

  // ---------- MONEY ----------
  async function renderMoney() {
    const d = await api(`/api/finance?period=${S.longPeriod}`);
    const f = S.finPlat === "total" ? d.finance.total : d.finance.platforms[S.finPlat];
    const row = (label, sub, amt, minus = true) => amt ? `<div class="row"><div class="lbl">${label}${sub ? `<small>${sub}</small>` : ""}</div><div class="amt ${minus ? "minus" : ""}">${minus ? "− " : ""}${inr(Math.abs(amt))}</div></div>` : "";
    const est = f.estimated_lines ? `<p class="hint">ℹ️ ${f.estimated_lines} order ka payment abhi settle nahi hua — unki fees aapke pichhle orders ke hisaab se <b>andaza</b> lagayi hai.${f.no_fee_history ? " Kuch platform ka fee data hi nahi hai, isliye munafa zyada dikh sakta hai. Payment report upload karo." : ""}</p>` : "";
    view.innerHTML = `
      ${periodChips("longPeriod", LONG)}
      <div class="periods" role="group" aria-label="Platform">
        ${[["total", "Sab milake"], ...PLATS.map(p => [p, PNAME[p]])].map(([k, l]) => `<button class="chip" data-fin="${k}" aria-pressed="${S.finPlat === k}">${l}</button>`).join("")}
      </div>
      <div class="grid">
        <div class="card"><div class="stat-label">Bikri (return ke baad)</div><div class="big">${inr(f.net_sale)}</div><div class="stat-sub">${num(f.orders)} orders</div></div>
        <div class="card status-${f.profit < 0 ? "bad" : "good"}"><div class="stat-label">Asli Munafa</div><div class="big">${inr(f.profit)}</div><div class="stat-sub">${f.margin_pct == null ? "" : f.margin_pct + "% margin"}</div></div>
      </div>
      <h2 class="section">Paisa kahan gaya — ${esc(d.period.label)}</h2>
      ${est}
      <div class="card flow">
        <div class="row"><div class="lbl">Customer ne diya<small>sab order (cancel chhod ke)</small></div><div class="amt">${inr(f.gross)}</div></div>
        ${row("Return / RTO wale order", "ye paisa wapas gaya", f.returned_value)}
        ${row("GST", "sarkar ka hissa", f.gst)}
        ${row("Marketplace fees", "commission, fixed fee", f.fee)}
        ${row("Shipping", "delivery + return shipping", f.shipping)}
        ${row("Baaki kataut", "penalty, storage, adjustments", f.other)}
        ${row("Ads", "Amazon / Flipkart ads", f.ads)}
        ${row("Maal ki keemat", "jo stock bika uski khareed", f.cogs)}
        <div class="row result"><div class="lbl"><b>Asli Munafa</b></div><div class="amt total ${f.profit < 0 ? "minus" : ""}">${inr(f.profit)}</div></div>
      </div>
      ${f.tax_credit ? `<p class="hint" style="margin-top:10px">🧾 TCS/TDS kata: <b>${inr(f.tax_credit)}</b> — ye GST/Income-tax return me wapas milta hai, isliye munafa me nahi ghataya.</p>` : ""}`;
    view.querySelectorAll("[data-fin]").forEach(b => b.addEventListener("click", () => { S.finPlat = b.dataset.fin; renderMoney(); }));
  }

  // ---------- STOCK ----------
  async function renderStock() {
    const d = await api("/api/stock");
    const t = d.totals;
    const used = t.purchased_value ? Math.min(100, 100 * t.cogs_value / t.purchased_value) : 0;
    const today = new Date().toISOString().slice(0, 10);
    view.innerHTML = `
      <div class="grid three">
        <div class="card"><div class="stat-label">🛒 Kul maal kharida</div><div class="big">${inr(t.purchased_value)}</div><div class="stat-sub">saare purchase bill</div></div>
        <div class="card"><div class="stat-label">📤 Bik chuka maal</div><div class="big">${inr(t.cogs_value)}</div><div class="stat-sub">sales se apne aap ghata</div></div>
        <div class="card"><div class="stat-label">📦 Godown me bacha maal</div><div class="big">${inr(t.pool_remaining)}</div><div class="stat-sub">${num(t.stock_units)} units</div></div>
      </div>
      <div class="card" style="margin-top:12px"><div class="stat-label">Kharide gaye maal me se kitna bik gaya</div>
        <div class="bar-track" style="height:14px"><div class="bar-fill pool" style="width:${used.toFixed(1)}%"></div></div>
        <div class="stat-sub">${used.toFixed(0)}% bik gaya · ${(100 - used).toFixed(0)}% bacha</div>
        ${t.units_without_cost ? `<p class="hint" style="margin-top:8px">⚠️ ${num(t.units_without_cost)} units bike jinka purchase bill nahi daala — neeche "Naya maal aaya" me daalo.</p>` : ""}
      </div>

      <h2 class="section">Har product ka stock</h2>
      <p class="hint">Stock = kharida − bika + wapas aaya (sellable). Product par tap karke cost / GST badlo.</p>
      <div class="grid">
        ${d.skus.length ? d.skus.map(s => `
          <div class="card tap ${s.level === "unknown" ? "" : "status-" + s.level}" data-sku="${esc(s.sku)}">
            <div class="name" style="font-weight:700">${esc(s.name)}</div>
            <div class="stat-sub">${esc(s.sku)}</div>
            <div class="big">${num(s.stock)} <span style="font-size:15px;font-weight:600;color:var(--muted)">units</span></div>
            ${s.level === "unknown" ? `<span class="pill muted">Purchase bill daalo</span>` : statusPill(s.level, s.level === "bad" ? (s.stock <= 0 ? "Khatam" : "Turant mangwao") : s.level === "watch" ? "Jaldi mangwao" : "Theek hai")}
            <div class="stat-sub" style="margin-top:6px">${s.days_left == null ? "Abhi bikri nahi" : "~" + Math.floor(s.days_left) + " din ka · " + s.per_day + "/din"}</div>
            <div class="stat-sub">Bacha maal: ${inr(s.pool_remaining)}</div>
          </div>`).join("") : `<div class="card empty">Abhi koi product nahi. Order data aane par apne aap dikhenge.</div>`}
      </div>

      <h2 class="section">➕ Naya maal aaya</h2>
      <form class="card form" id="buy">
        <label class="full">Product<select name="sku" required>${d.skus.map(s => `<option value="${esc(s.sku)}">${esc(s.name)} (${esc(s.sku)})</option>`).join("")}<option value="__new">+ Naya product (SKU likho)</option></select></label>
        <label class="full" id="newsku" hidden>Naya SKU<input name="new_sku" placeholder="PN-..."></label>
        <label>Kitne units<input name="qty" type="number" min="1" inputmode="numeric" required></label>
        <label>Kul bill (₹)<input name="total_cost" type="number" min="0" step="0.01" inputmode="decimal" placeholder="ya per unit"></label>
        <label>Per unit (₹)<input name="unit_cost" type="number" min="0" step="0.01" inputmode="decimal" placeholder="optional"></label>
        <label>Tareekh<input name="purchase_date" type="date" value="${today}"></label>
        <label class="full">Supplier<input name="supplier" placeholder="optional"></label>
        <button class="btn full" type="submit">Save karo</button>
      </form>

      <h2 class="section">Purchase history</h2>
      <div class="card">${d.purchases.length ? d.purchases.map(p => `
        <div class="item"><div class="main"><div class="name">${esc(p.name)}</div>
        <div class="meta">${dayLabel(p.purchase_date)} · ${num(p.qty)} × ${inr(p.unit_cost)}${p.supplier ? " · " + esc(p.supplier) : ""}</div></div>
        <div class="num">${inr(p.qty * p.unit_cost)}<br><button class="link-btn danger" data-delpurchase="${p.id}">hatao</button></div></div>`).join("") : `<div class="empty">Koi purchase nahi daala</div>`}</div>`;

    const form = document.getElementById("buy");
    form.sku.addEventListener("change", () => (document.getElementById("newsku").hidden = form.sku.value !== "__new"));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      if (fd.sku === "__new") fd.sku = (fd.new_sku || "").trim();
      try { await api("/api/purchases", { json: fd }); toast("✓ Purchase save ho gaya"); renderStock(); }
      catch (err) { toast("⚠️ " + err.message); }
    });
    view.querySelectorAll("[data-delpurchase]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Ye purchase entry hatani hai?")) return;
      await api(`/api/purchases/${b.dataset.delpurchase}`, { method: "DELETE" }); renderStock();
    }));
    view.querySelectorAll("[data-sku]").forEach(c => c.addEventListener("click", () => editProduct(d.skus.find(s => s.sku === c.dataset.sku))));
  }

  function editProduct(s) {
    const name = prompt(`Product ka naam (${s.sku})`, s.name); if (name === null) return;
    const gst = prompt("GST % (jo bikri price me shamil hai)", s.gst_rate); if (gst === null) return;
    const low = prompt("Kitne units se kam hone par alert?", s.low_stock_units); if (low === null) return;
    const cost = prompt("Per unit cost (sirf tab kaam aata hai jab purchase bill na ho)", s.unit_cost || ""); if (cost === null) return;
    api(`/api/products/${encodeURIComponent(s.sku)}`, { method: "PUT", json: { name, gst_rate: gst, low_stock_units: low, unit_cost: cost } })
      .then(() => { toast("✓ Save ho gaya"); renderStock(); }).catch(e => toast("⚠️ " + e.message));
  }

  // ---------- PRODUCTS ----------
  async function renderProducts() {
    const d = await api(`/api/ranking?period=${S.longPeriod}`);
    const max = Math.max(1, ...d.items.map(i => Math.abs(i.profit)));
    view.innerHTML = `
      ${periodChips("longPeriod", LONG)}
      <p class="hint">Sabse zyada kamai wale upar, nuksaan wale neeche (laal). Munafa = bikri − GST − fees − shipping − maal ki keemat − ads ka hissa.</p>
      <div class="card">${d.items.length ? d.items.map((it, i) => `
        <div class="item" style="align-items:flex-start"><div class="rank">${i + 1}</div>
          <div class="main"><div class="name">${esc(it.name)}</div>
            <div class="meta">${num(it.units)} bike · ${pct(it.return_pct)} return · ${it.profit_per_unit == null ? "" : inr(it.profit_per_unit) + "/unit"}</div>
            <div class="bar-track"><div class="bar-fill ${it.profit < 0 ? "neg" : ""}" style="width:${(100 * Math.abs(it.profit) / max).toFixed(1)}%"></div></div>
            <div class="meta" style="margin-top:4px">${PLATS.filter(p => it.platforms[p]).map(p => `<span class="dot ${p}"></span>${inrShort(it.platforms[p])}`).join(" &nbsp;")}</div>
          </div>
          <div class="num"><span class="${it.profit < 0 ? "danger" : ""}">${inr(it.profit)}</span><br>
            ${it.margin_pct == null ? "" : statusPill(it.profit < 0 ? "bad" : it.margin_pct < 10 ? "watch" : "good", it.margin_pct + "%")}</div>
        </div>`).join("") : `<div class="empty">Is samay me koi bikri nahi</div>`}</div>`;
  }

  // ---------- ADS ----------
  async function renderAds() {
    const d = await api(`/api/ads?period=${S.longPeriod}`);
    view.innerHTML = `
      ${periodChips("longPeriod", LONG)}
      <p class="hint">ROAS = ads se aayi bikri ÷ ads kharch. 3 se upar achha, 2 se neeche dhyaan do.</p>
      ${Object.keys(d.panel_summaries || {}).length ? `<h2 class="section">Seller panel se (pichhle 7 din)</h2>
      <div class="grid three">${Object.values(d.panel_summaries).map(x => {
        const roi = x.roi != null ? x.roi : (x.revenue && x.spend ? +(x.revenue / x.spend).toFixed(2) : null);
        const lvl = roi == null ? "good" : roi >= 3 ? "good" : roi >= 2 ? "watch" : "bad";
        return `<div class="card status-${lvl}"><div class="plat-name"><span class="dot ${esc(x.platform)}"></span>${PNAME[x.platform] || esc(x.platform)} Ads</div>
          <div class="stat-sub">${dayLabel(x.period_start)} – ${dayLabel(x.period_end)} · ${dayLabel(x.captured_on)} ko padha</div>
          <div class="big">${roi == null ? "—" : roi + "×"}</div>${roi == null ? "" : statusPill(lvl, "ROI")}
          <div class="kv" style="margin-top:8px"><span>Kharch</span><b>${inr(x.spend)}</b></div>
          <div class="kv"><span>Ads se bikri</span><b>${inr(x.revenue)}</b></div>
          <div class="kv"><span>Units bike</span><b>${num(x.units)}</b></div>
          <div class="kv"><span>Clicks · Views</span><b>${num(x.clicks)} · ${num(x.views)}</b></div></div>`;
      }).join("")}</div>` : ""}

      <div class="grid three">
        ${PLATS.filter(p => d.platforms[p].spend || (p !== "meesho" && !(d.panel_summaries || {})[p])).map(p => {
          const a = d.platforms[p]; const lvl = a.roas == null ? "good" : a.roas >= 3 ? "good" : a.roas >= 2 ? "watch" : "bad";
          return `<div class="card ${a.spend ? "status-" + lvl : ""}">
            <div class="plat-name"><span class="dot ${p}"></span>${PNAME[p]} Ads</div>
            <div class="big">${a.roas == null ? "—" : a.roas + "×"}</div>
            ${a.roas == null ? `<span class="pill muted">Ads data nahi</span>` : statusPill(lvl, lvl === "good" ? "Achha" : lvl === "watch" ? "Theek-thaak" : "Kam fayda")}
            <div class="kv" style="margin-top:8px"><span>Kharch</span><b>${inr(a.spend)}</b></div>
            <div class="kv"><span>Ads se bikri</span><b>${inr(a.ad_sales)}</b></div>
            <div class="kv"><span>ACoS</span><b>${pct(a.acos)}</b></div>
            <div class="kv"><span>Total bikri me ads %</span><b>${pct(a.tacos)}</b></div>
          </div>`;
        }).join("")}
      </div>
      <h2 class="section">Campaign ke hisaab se</h2>
      <div class="card">${d.campaigns.length ? d.campaigns.map(c => {
        const roas = c.spend ? (c.sales / c.spend).toFixed(1) : null;
        return `<div class="item"><div class="main"><div class="name">${esc(c.campaign || "(naam nahi)")}</div>
          <div class="meta"><span class="dot ${esc(c.platform)}"></span>${PNAME[c.platform] || ""} · kharch ${inr(c.spend)} · bikri ${inr(c.sales)}</div></div>
          <div class="num">${roas == null ? "—" : roas + "×"}</div></div>`;
      }).join("") : `<div class="empty">Ads report upload karo (⚙️ Data)</div>`}</div>`;
  }

  // ---------- LISTINGS (reviews + competitors) ----------
  function stars(r) { if (r == null) return ""; const f = Math.round(r); return `<span class="stars" aria-hidden="true">${"★".repeat(f)}${"☆".repeat(5 - f)}</span>`; }
  function sparkline(hist, key) {
    const pts = hist.filter(h => h[key] != null); if (pts.length < 2) return "";
    const vals = pts.map(p => p[key]), min = Math.min(...vals), max = Math.max(...vals), W = 160, H = 36;
    const rng = max - min || 1;
    const d = pts.map((p, i) => `${i ? "L" : "M"}${(i * W / (pts.length - 1)).toFixed(1)},${(H - 4 - (H - 8) * (p[key] - min) / rng).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--ink-2)" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }

  async function renderListings(kind) {
    const d = await api(`/api/listings?kind=${kind}`);
    const own = kind === "own";
    view.innerHTML = `
      <p class="hint">${own ? "Apni listing ki rating aur reviews. Link daaloge to roz apne aap check karne ki koshish hogi; Amazon/Flipkart kabhi block karte hain — tab haath se number daal do." :
        "Competitor ka price roz. Link daalo, ya haath se price daalo."}</p>
      <div class="grid">
        ${d.items.length ? d.items.map(it => {
          const L = it.latest || {};
          if (own) {
            const ch = it.rating_change; const lvl = ch == null ? "good" : ch <= -0.2 ? "bad" : ch < 0 ? "watch" : "good";
            return `<div class="card status-${lvl}">
              <div class="name" style="font-weight:700">${esc(it.label)}</div>
              <div class="stat-sub">${it.platform ? PNAME[it.platform] || "" : ""}${it.stale ? " · ⚠ purana data" : ""}</div>
              <div class="big">${L.rating == null ? "—" : L.rating.toFixed(1)} ${stars(L.rating)}</div>
              ${ch == null ? "" : statusPill(lvl, (ch > 0 ? "▲ " : ch < 0 ? "▼ " : "") + Math.abs(ch).toFixed(2) + " (7 din)")}
              <div class="stat-sub" style="margin-top:6px">${num(L.review_count)} ratings${it.new_reviews ? ` · +${num(it.new_reviews)} naye` : ""}</div>
              ${sparkline(it.history, "rating")}
              <div style="margin-top:8px;display:flex;gap:12px"><button class="link-btn" data-snap="${it.id}">✎ Aaj ka number daalo</button><button class="link-btn danger" data-dellisting="${it.id}">hatao</button>${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener" style="font-size:14px">khol ke dekho ↗</a>` : ""}</div>
            </div>`;
          }
          const ch = it.price_change; const cheaper = it.our_price && L.price && L.price < it.our_price;
          return `<div class="card ${cheaper ? "status-watch" : ""}">
            <div class="name" style="font-weight:700">${esc(it.label)}</div>
            <div class="stat-sub">${it.platform ? PNAME[it.platform] || "" : ""}${it.stale ? " · ⚠ purana data" : ""}</div>
            <div class="big">${L.price == null ? "—" : inr(L.price)}</div>
            ${ch ? statusPill(ch < 0 ? "watch" : "good", (ch < 0 ? "▼ " : "▲ ") + inr(Math.abs(ch)) + " (7 din)") : ""}
            ${it.our_price ? `<div class="stat-sub" style="margin-top:6px">Aapka avg price: ${inr(it.our_price)}${cheaper ? " — <b>competitor sasta hai</b>" : ""}</div>` : ""}
            ${sparkline(it.history, "price")}
            <div style="margin-top:8px;display:flex;gap:12px"><button class="link-btn" data-snap="${it.id}">✎ Aaj ka price daalo</button><button class="link-btn danger" data-dellisting="${it.id}">hatao</button>${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener" style="font-size:14px">khol ke dekho ↗</a>` : ""}</div>
          </div>`;
        }).join("") : `<div class="card empty">Abhi kuch add nahi kiya</div>`}
      </div>
      <h2 class="section">➕ ${own ? "Apni listing jodo" : "Competitor jodo"}</h2>
      <form class="card form" id="addl">
        <label class="full">Naam<input name="label" required placeholder="${own ? "Sea Buckthorn – Amazon" : "Competitor X – 500ml"}"></label>
        <label>Platform<select name="platform"><option value="">—</option>${PLATS.map(p => `<option value="${p}">${PNAME[p]}</option>`).join("")}</select></label>
        <label>Aapka SKU<input name="sku" placeholder="PN-..."></label>
        <label class="full">Link (optional)<input name="url" type="url" placeholder="https://..."></label>
        <button class="btn full" type="submit">Jodo</button>
      </form>`;
    document.getElementById("addl").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target)); fd.kind = kind;
      try { await api("/api/listings", { json: fd }); toast("✓ Jod diya"); renderListings(kind); } catch (err) { toast("⚠️ " + err.message); }
    });
    view.querySelectorAll("[data-dellisting]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Isse list se hatana hai?")) return;
      await api(`/api/listings/${b.dataset.dellisting}`, { method: "DELETE" }); renderListings(kind);
    }));
    view.querySelectorAll("[data-snap]").forEach(b => b.addEventListener("click", async () => {
      let body;
      if (own) {
        const rating = prompt("Aaj ki rating (jaise 4.2)"); if (rating === null) return;
        const reviews = prompt("Kitni ratings/reviews total?"); if (reviews === null) return;
        body = { rating, review_count: reviews };
      } else {
        const price = prompt("Aaj ka price (₹)"); if (price === null) return;
        body = { price };
      }
      try { await api(`/api/listings/${b.dataset.snap}/snapshot`, { json: body }); toast("✓ Save"); renderListings(kind); } catch (err) { toast("⚠️ " + err.message); }
    }));
  }

  // ---------- CASH ----------
  async function renderCash() {
    const d = await api("/api/cashflow");
    const pend = PLATS.filter(p => d.pending[p]);
    const pendTotal = pend.reduce((s, p) => s + d.pending[p].amount, 0);
    view.innerHTML = `
      <div class="grid">
        <div class="card"><div class="stat-label">🏦 Pichhle 30 din bank me aaya</div><div class="big">${inr(d.last_30_received)}</div></div>
        <div class="card"><div class="stat-label">⏳ Aane wala paisa (andaza)</div><div class="big">${inr(pendTotal)}</div><div class="stat-sub">jo order abhi settle nahi hue</div></div>
      </div>
      ${pend.length ? `<div class="card" style="margin-top:12px">${pend.map(p => `<div class="kv" style="flex-wrap:wrap"><span class="plat-name"><span class="dot ${p}"></span>${PNAME[p]}</span><span><b>${inr(d.pending[p].amount)}</b> <span class="stat-sub">· ${num(d.pending[p].orders)} orders, ${dayLabel(d.pending[p].oldest)} se</span></span></div>`).join("")}</div>` : ""}
      <h2 class="section">Har payment</h2>
      <p class="hint">"Marketplace ne diya" = platform ne payment release kiya · "Bank me aaya" = aapke khate me pahuncha.</p>
      <div class="card">${d.payouts.length ? d.payouts.map(p => `
        <div class="item"><div class="main"><div class="name"><span class="dot ${esc(p.platform)}"></span>${PNAME[p.platform] || esc(p.platform)}</div>
          <div class="meta">Marketplace ne diya: ${p.credited_date ? dayLabel(p.credited_date) : "—"} · Bank me: ${p.bank_date ? dayLabel(p.bank_date) : "—"}${p.gap_days ? ` (${p.gap_days} din baad)` : ""}</div></div>
          <div class="num">${inr(p.amount)}</div></div>`).join("") : `<div class="empty">Abhi koi payment nahi aaya — n8n payments page padhega, ya payment report upload karo (⚙️ Data)</div>`}</div>
      <h2 class="section">Mahine ke hisaab se</h2>
      <div class="card table-scroll"><table class="simple"><tr><th>Mahina</th>${PLATS.map(p => `<th class="n">${PNAME[p]}</th>`).join("")}<th class="n">Total</th></tr>
        ${Object.entries(d.by_month).map(([m, v]) => `<tr><td>${new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>${PLATS.map(p => `<td class="n">${inr(v[p] || 0)}</td>`).join("")}<td class="n"><b>${inr(Object.values(v).reduce((a, b) => a + b, 0))}</b></td></tr>`).join("")}
      </table></div>`;
  }

  // ---------- REPORT ----------
  async function renderReport() {
    const d = await api(`/api/report?kind=${S.reportKind}`);
    view.innerHTML = `
      <div class="periods">${[["week", "Hafte ki report"], ["month", "Mahine ki report"]].map(([k, l]) => `<button class="chip" data-rk="${k}" aria-pressed="${S.reportKind === k}">${l}</button>`).join("")}</div>
      <div class="card"><h2 class="section" style="margin-top:0">${esc(d.title)}</h2>
        ${d.lines.map(l => `<div class="report-line">${esc(l)}</div>`).join("")}</div>
      <p class="hint" style="margin-top:12px">n8n ye report Telegram par bhejta hai: har Somvaar subah (hafta) aur har mahine ki 1 tareekh.</p>`;
    view.querySelectorAll("[data-rk]").forEach(b => b.addEventListener("click", () => { S.reportKind = b.dataset.rk; renderReport(); }));
  }

  // ---------- DATA ----------
  const HOWTO = {
    amazon: ["Orders: Seller Central → Reports → Fulfillment → All Orders (ya API se apne aap)",
             "Returns: Reports → Return Reports", "Payments: Reports → Payments → All Statements → Download flat file (V2)",
             "Ads: Advertising → Reports → Sponsored Products (daily)"],
    flipkart: ["Orders: Seller Hub → Reports → Sales Report / Orders report",
               "Returns: Seller Hub → Returns → Download", "Payments: Payments → Settled Transactions → Download (Orders sheet)",
               "Ads: Flipkart Ads → Reports → Campaign report (daily)"],
    meesho: ["Orders: Supplier Panel → Orders → Download", "Payments: Payments → Download (Order Payments sheet)",
             "Returns: Returns → Download"],
  };

  async function renderData() {
    const [d, au] = await Promise.all([api("/api/data/status"), api("/api/audit")]);
    view.innerHTML = `
      ${demoBanner(d.demo)}
      <h2 class="section">🔌 n8n se data</h2>
      <div class="card">
        ${PLATS.map(p => {
          const f = d.freshness[p];
          const lvl = f.last_status === "error" ? "bad" : f.stale ? "watch" : "good";
          return `<div class="kv" style="flex-wrap:wrap"><span class="plat-name"><span class="dot ${p}"></span>${PNAME[p]}</span>
            ${statusPill(lvl, f.last_ok ? "Last: " + when(f.last_ok) : "Abhi data nahi")}
            ${f.last_status === "error" ? `<div class="stat-sub danger" style="flex-basis:100%">${esc(f.last_message)}</div>` : ""}</div>`;
        }).join("")}
        <div class="kv"><span>🔑 n8n token (AUDIT_TOKEN)</span>${d.n8n.token_set ? `<span class="pill good">✓ Set hai</span>` : `<span class="pill bad">✕ Set nahi</span>`}</div>
        <div class="kv"><span>🧠 Claude key (page padhne ke liye)</span>${d.n8n.claude_key_set ? `<span class="pill good">✓ Set hai</span>` : `<span class="pill bad">✕ Set nahi</span>`}</div>
        <div class="kv"><span>📥 n8n ka aakhri page</span><span class="stat-sub">${d.n8n.last_page ? when(d.n8n.last_page.created_at) + " · " + esc(PNAME[d.n8n.last_page.platform] || d.n8n.last_page.platform) + " " + esc(d.n8n.last_page.page_kind) : "abhi nahi aaya"}</span></div>
        <p class="hint" style="margin:10px 0 0">Data roz subah n8n laata hai. Alerts aur reports bhi n8n bhejta hai. Setup: README → "Pehli baar setup".</p>
      </div>

      <h2 class="section">📤 Report file daalo</h2>
      <p class="hint">Kabhi n8n se kuch chhoot jaye to seller panel se download ki hui file seedha yahan daal sakte ho — kaunsi report hai, dashboard khud pehchaan lega. Ek hi file dobara daalne se kuch double nahi hota.</p>
      <div class="card form">
        <label class="full">Kahan ki file hai?<select id="upplat"><option value="">Pehchaan lo (auto)</option>${PLATS.map(p => `<option value="${p}">${PNAME[p]}</option>`).join("")}<option value="purchases">Maal khareed (purchase sheet)</option></select></label>
        <div class="drop full" id="drop" tabindex="0" role="button">📄 <b>File chuno</b> ya yahan kheencho<br><span class="stat-sub">CSV / TXT / XLSX · ek saath kai files</span></div>
        <input type="file" id="file" multiple accept=".csv,.tsv,.txt,.xlsx,.xlsm" hidden>
        <div id="upres" class="full"></div>
      </div>
      <details class="card" style="margin-top:12px"><summary>Kaunsi report kahan se download karein?</summary>
        ${PLATS.map(p => `<p style="margin:12px 0 4px"><span class="dot ${p}"></span><b>${PNAME[p]}</b></p><ul style="margin:0;padding-left:20px;font-size:14px">${HOWTO[p].map(h => `<li>${esc(h)}</li>`).join("")}</ul>`).join("")}
        <p style="font-size:14px;margin-top:12px"><b>Maal khareed sheet:</b> columns — Date, SKU, Qty, Unit Cost (ya Total Cost), Supplier</p>
      </details>

      ${d.unmapped.length ? `<h2 class="section">🔗 SKU milao</h2>
      <p class="hint">Ye SKU bik rahe hain par inka koi purchase bill nahi hai. Agar ye kisi aur SKU ka doosra naam hai (har platform par SKU alag ho sakta hai) to "Jodo" dabao; warna 📊 Stock me iska purchase daalo.</p>
      <div class="card">${d.unmapped.map(u => `<div class="item"><div class="main"><div class="name">${esc(u.platform_sku)}</div><div class="meta"><span class="dot ${esc(u.platform)}"></span>${PNAME[u.platform] || ""} · ${num(u.n)} orders</div></div>
        <button class="btn small secondary" data-map="${esc(u.platform)}|${esc(u.platform_sku)}">Jodo</button></div>`).join("")}</div>` : ""}

      <h2 class="section">🤖 n8n ki jaanch</h2>
      ${auditCard(au.items, true)}
      ${au.items.length > 1 ? `<details class="card" style="margin-top:12px"><summary>Pichhli jaanch (${au.items.length - 1})</summary>${au.items.slice(1).map(r => `<div class="item"><div class="main"><div class="name">${dayLabel(r.day)} · ${esc({ ok: "✓ Sab mila", fixed: "🔧 Theek kiya", problem: "⚠ Dhyaan do" }[r.status] || r.status)}</div><div class="meta">${esc(r.summary || "")}</div></div></div>`).join("")}</details>` : ""}

      <h2 class="section">📜 Pichhle updates</h2>
      <div class="card table-scroll"><table class="simple"><tr><th>Kab</th><th>Platform</th><th>Kaise</th><th>Status</th><th class="n">Rows</th></tr>
        ${d.runs.map(r => `<tr><td>${when(r.finished_at || r.started_at)}</td><td>${esc(PNAME[r.platform] || r.platform)}</td><td>${esc(r.job)}</td>
          <td>${r.status === "ok" ? "✓" : r.status === "error" ? `<span class="danger" title="${esc(r.message)}">✕ error</span>` : esc(r.status)}</td><td class="n">${num(r.rows)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Abhi kuch nahi</td></tr>`}
      </table></div>

      <h2 class="section">🧪 Demo</h2>
      <div class="card">${d.demo ? `<p style="margin-top:0">Demo data chal raha hai. Asli data daalne se pehle hatao:</p><button class="btn secondary" id="democlear">Demo data hatao</button>`
        : `<p style="margin-top:0">Dashboard kaisa dikhta hai dekhne ke liye sample data daal sakte ho (sirf khaali dashboard me).</p><button class="btn secondary" id="demoload">Demo data daalo</button>`}</div>`;

    const drop = document.getElementById("drop"), input = document.getElementById("file");
    drop.addEventListener("click", () => input.click());
    drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") input.click(); });
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); uploadFiles(e.dataTransfer.files); });
    input.addEventListener("change", () => uploadFiles(input.files));

    const dl = document.getElementById("demoload"), dc = document.getElementById("democlear");
    if (dl) dl.addEventListener("click", async () => { try { await api("/api/demo/load", { method: "POST" }); toast("✓ Demo data daal diya"); location.hash = "home"; } catch (err) { toast("⚠️ " + err.message); } });
    if (dc) dc.addEventListener("click", async () => { if (!confirm("Saara demo data hatana hai? (Aapka asli data nahi hatega)")) return; await api("/api/demo/clear", { method: "POST" }); toast("✓ Demo data hata diya"); renderData(); });
    view.querySelectorAll("[data-map]").forEach(b => b.addEventListener("click", async () => {
      const [platform, psku] = b.dataset.map.split("|");
      const choices = d.products.map(p => p.sku).filter(s => s !== psku);
      const sku = prompt(`"${psku}" (${PNAME[platform]}) kis asli SKU ka hai?\n\nAapke SKU: ${choices.slice(0, 15).join(", ")}`);
      if (!sku) return;
      try { await api("/api/aliases", { json: { platform, platform_sku: psku, sku: sku.trim() } }); toast("✓ Jod diya"); renderData(); } catch (err) { toast("⚠️ " + err.message); }
    }));
  }

  async function uploadFiles(fileList) {
    const out = document.getElementById("upres"), plat = document.getElementById("upplat").value;
    for (const f of fileList) {
      const line = document.createElement("div"); line.className = "item";
      line.innerHTML = `<div class="main"><div class="name">${esc(f.name)}</div><div class="meta">upload ho raha hai…</div></div>`;
      out.prepend(line);
      const fd = new FormData(); fd.append("file", f); fd.append("platform", plat);
      try {
        const r = await fetch("/api/upload", { method: "POST", body: fd, credentials: "same-origin" });
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Upload fail");
        line.querySelector(".meta").innerHTML = data.results.map(x => `✓ ${esc(x.kind)}: <b>${num(x.rows)}</b> rows${x.skipped ? ` (${x.skipped} chhod diye)` : ""}`).join("<br>");
      } catch (err) {
        line.querySelector(".meta").innerHTML = `<span class="danger">✕ ${esc(err.message)}</span>`;
      }
    }
  }

  const RENDER = {
    home: renderHome, orders: renderOrders, returns: renderReturns, money: renderMoney, stock: renderStock,
    products: renderProducts, ads: renderAds, reviews: () => renderListings("own"),
    competitors: () => renderListings("competitor"), cash: renderCash, report: renderReport, data: renderData,
  };
  render();
})();
