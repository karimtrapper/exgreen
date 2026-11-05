/* Метки прямых контактных ссылок на отдельных страницах. */
(() => {
  "use strict";
  const pageParams = new URLSearchParams(location.search);
  const allowed = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("grusha_utms") || "{}"); } catch { /* localStorage может быть недоступен */ }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  for (const key of allowed) {
    if (typeof saved[key] !== "string") delete saved[key];
    else saved[key] = saved[key].replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  }
  for (const key of allowed) {
    const value = pageParams.get(key);
    if (value) saved[key] = value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  }
  try { localStorage.setItem("grusha_utms", JSON.stringify(saved)); } catch { /* URL продолжает работать */ }
  let ref = pageParams.get("ref") || "";
  let fbclid = pageParams.get("fbclid") || "";
  try {
    ref = ref || localStorage.getItem("grusha_ref") || "";
    fbclid = fbclid || localStorage.getItem("grusha_fbclid") || "";
    if (pageParams.get("ref")) localStorage.setItem("grusha_ref", ref);
    if (pageParams.get("fbclid")) localStorage.setItem("grusha_fbclid", fbclid);
  } catch { /* локальные метки остаются доступными */ }
  const goalParams = (placement) => {
    const params = { surface: "website", placement };
    for (const key of allowed) if (saved[key]) params[key] = saved[key];
    return params;
  };
  const start = (placement) => {
    const clean = (v) => String(v).replace(/[^A-Za-z0-9]/g, "");
    const cleanMeta = (v) => String(v).replace(/[^A-Za-z0-9_-]/g, "");
    if (fbclid) return `${cleanMeta(saved.utm_content || "direct")}__${cleanMeta(fbclid)}`.slice(0, 64);
    if (ref) return `ref__${clean(ref)}_${placement}`.slice(0, 64);
    return `utm_source__${clean(saved.utm_source || "website")}_${placement}`.slice(0, 64);
  };
  if (typeof window.ym !== "function") {
    window.ym = function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://mc.yandex.ru/metrika/tag.js?id=106232718";
    document.head.appendChild(tag);
    window.ym(106232718, "init", { clickmap: true, trackLinks: false, accurateTrackBounce: true, webvisor: false });
  }
  document.querySelectorAll("a[data-contact-placement]").forEach(link => {
    const placement = link.dataset.contactPlacement;
    if (link.href.includes("Grushath_bot")) link.href = `https://t.me/Grushath_bot?start=${start(placement)}`;
    link.addEventListener("click", () => {
      try {
        const channel = link.href.includes("Grushath_bot") ? "tg" : "wa";
        window.ym(106232718, "reachGoal", `click_${channel}_${placement}`, goalParams(placement));
        window.ym(106232718, "reachGoal", "any_contact", goalParams(placement));
      } catch { /* переход не зависит от Метрики */ }
    });
  });
})();
