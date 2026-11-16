(() => {
  const header=document.querySelector('.grusha-header');
  if(!header)return;
  const menu=document.getElementById('sharedMobileMenu'),toggle=document.getElementById('sharedMenuToggle');
  let previousOverflow='';
  function setMobile(open){
    if(open===!menu.hidden)return;
    menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
    if(open){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}else document.body.style.overflow=previousOverflow;
  }
  toggle.addEventListener('click',()=>setMobile(menu.hidden));
  header.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{
    details.querySelector('summary').setAttribute('aria-expanded',String(details.open));
    if(details.open)header.querySelectorAll('details').forEach(other=>{if(other!==details)other.open=false});
  }));
  header.querySelectorAll('summary').forEach(summary=>summary.setAttribute('aria-expanded','false'));
  document.addEventListener('click',e=>{if(!header.contains(e.target))header.querySelectorAll('details[open]').forEach(d=>d.open=false)});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const open=header.querySelector('details[open]');if(open){open.open=false;open.querySelector('summary').focus()}if(!menu.hidden){setMobile(false);toggle.focus()}});
  matchMedia('(min-width:1091px)').addEventListener('change',e=>{if(e.matches)setMobile(false)});
  header.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{setMobile(false);header.querySelectorAll('details[open]').forEach(d=>d.open=false)}));
  header.querySelectorAll('[data-shared-contact]').forEach(button=>button.addEventListener('click',()=>{
    const wasMobile=!menu.hidden;
    if(wasMobile){setMobile(false);toggle.focus()}
    header.querySelectorAll('details[open]').forEach(d=>d.open=false);
    if(document.body.dataset.grushaPage==='agents'&&typeof window.openContact==='function')window.openContact();
    else if(typeof window.openContactDialog==='function')window.openContactDialog('header',wasMobile?toggle:button);
  }));

  const home=document.body.dataset.grushaPage==='home';
  const currency=new URLSearchParams(location.search).get('currency');
  if(home&&['RUB','USDT'].includes(currency)&&typeof scrollToCalc==='function')scrollToCalc(currency);
  header.querySelectorAll('[data-currency]').forEach(a=>a.addEventListener('click',e=>{
    if(!home||typeof scrollToCalc!=='function')return;
    e.preventDefault();scrollToCalc(a.dataset.currency);history.replaceState(null,'','#calculator');
  }));
  function paint(data){
    const rub=Number(data.rub_usdt)/(Number(data.usdt_thb)*(1-.0272));
    const usdt=Number(data.usdt_thb)*(1-.03);
    if(!data.success||![rub,usdt].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid rates');
    header.querySelector('[data-rate-rub]').textContent=`1 ฿ ≈ ${rub.toFixed(2)} ₽`;
    header.querySelector('[data-rate-usdt]').textContent=`1 USDT ≈ ${usdt.toFixed(2)} ฿`;
    header.querySelectorAll('.shared-rate').forEach(a=>{a.dataset.state='success';a.title='Ориентировочный курс. Рассчитать под вашу сумму'});
  }
  async function refresh(){
    try{const r=await fetch('https://grusha.up.railway.app/api/rates',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Rates unavailable');paint(await r.json())}
    catch{header.querySelectorAll('.shared-rate').forEach(a=>{a.dataset.state='error';a.title='Курс уточнит менеджер'});header.querySelectorAll('[data-rate-rub],[data-rate-usdt]').forEach(b=>b.textContent='Курс по запросу')}
  }
  if(header.querySelector('[data-rate-rub]')){refresh();setInterval(refresh,60000)}
})();
