/* Cookie-баннер согласия (Google Consent Mode v2, advanced).
   Дефолт denied и восстановление выбора ставятся inline в <head> до GTM. */
(function () {
  var KEY = 'grusha_consent';

  // Безопасное чтение localStorage (может быть недоступен)
  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  if (read()) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Применяем выбор: обновляем согласия, сохраняем, скрываем баннер
  function choose(value, root) {
    gtag('consent', 'update', {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value
    });
    write(value);
    window.dataLayer.push({ event: 'consent_update' });
    root.parentNode && root.parentNode.removeChild(root);
  }

  function init() {
    var root = document.createElement('div');
    root.id = 'gc-consent';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Согласие на использование cookie');
    root.innerHTML =
      '<style>' +
      '#gc-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;display:flex;justify-content:center;pointer-events:none;font-family:"Plus Jakarta Sans",system-ui,-apple-system,sans-serif}' +
      '#gc-consent .gc-box{pointer-events:auto;box-sizing:border-box;max-width:760px;width:100%;background:#fff;border:1px solid #E6E9E7;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.14);padding:16px 18px;display:flex;flex-direction:column;gap:12px;color:#111;font-size:14px;line-height:1.45}' +
      '#gc-consent p{margin:0}' +
      '#gc-consent a{color:#111;text-decoration:underline}' +
      '#gc-consent .gc-btns{display:flex;gap:8px}' +
      '#gc-consent button{flex:1 1 0;cursor:pointer;font:inherit;font-weight:700;padding:11px 20px;border-radius:100px;background:#D9F99D;color:#111;border:1px solid #D9F99D;min-height:44px}' +
      '#gc-consent button:hover{filter:brightness(.96)}' +
      '#gc-consent button:focus-visible{outline:2px solid #111;outline-offset:2px}' +
      '@media(min-width:640px){#gc-consent{bottom:20px}#gc-consent .gc-box{flex-direction:row;align-items:center;gap:20px}#gc-consent .gc-btns{flex:0 0 auto}#gc-consent button{flex:0 0 auto;min-width:120px}}' +
      '</style>' +
      '<div class="gc-box">' +
      '<p>Мы используем cookie для аналитики и рекламы. Подробнее — в <a href="/privacy.html">политике конфиденциальности</a>.</p>' +
      '<div class="gc-btns"><button type="button" data-gc="granted">Принять</button><button type="button" data-gc="denied">Отклонить</button></div>' +
      '</div>';
    root.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute('data-gc');
      if (v) choose(v, root);
    });
    document.body.appendChild(root);
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
