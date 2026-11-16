/* Agent page analytics. Only named actions and allowlisted, non-personal dimensions leave the page. */
(() => {
  'use strict';
  if (document.body.dataset.grushaPage !== 'agents') return;
  const debug = new URLSearchParams(location.search).get('analytics_debug') === '1';
  const log = window.__agentsAnalyticsLog = [];
  const $ = (s, root = document) => root.querySelector(s);
  const allowed = {
    section: ['hero','routes','calculator','methods','process','earnings','cabinet','format','documents','faq','final'],
    type: ['freehold','leasehold'], currency: ['thb','usd'],
    amount_bucket: ['under_100k','100k_1m','1m_10m','10m_plus','invalid'],
    count_bucket: ['zero','one','two_five','six_plus','invalid'],
    method: ['rub','sbp','cash','usdt'], action: ['open','close','prev','next','swipe','play','pause','end'],
    trigger: ['click','scroll','keyboard','hover'], stage: ['invoice','payment','confirmation'],
    source: ['property','car','business','salary','deposit_interest','savings','other'],
    document: ['bank','virtual','registration','advice','contract_freehold','contract_leasehold'],
    question: ['1','2','3','4','5','6','7'], channel: ['tg','wa'],
    placement: ['header','hero','routes','calculator','methods','process','earnings','cabinet','documents','faq','final','footer','other'],
    destination: ['home','agents','calculator','documents','external'],
    result: ['success','invalid'], consent: ['granted','denied','unset']
  };
  const consent = () => { try { return localStorage.getItem('grusha_consent') || 'unset'; } catch { return 'unset'; } };
  const canRecord = () => debug || consent() === 'granted';
  const clean = details => Object.fromEntries(Object.entries(details || {}).filter(([key, value]) => allowed[key]?.includes(String(value))).map(([key,value]) => [key,String(value)]));
  function emit(name, details = {}) {
    if (!/^ag_[a-z_]+$/.test(name)) return;
    const params = clean(details), record = {event:name, ...params, consent:consent()};
    if (debug) { log.push(record); return true; }
    if (record.consent !== 'granted') return false;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event:name, agents:params});
    if (typeof window.ym === 'function') try { window.ym(106232718,'reachGoal',name,params); } catch { /* navigation stays usable */ }
    return true;
  }
  const bucket = n => !Number.isFinite(n) || n <= 0 ? 'invalid' : n < 100000 ? 'under_100k' : n < 1000000 ? '100k_1m' : n < 10000000 ? '1m_10m' : '10m_plus';
  const amount = () => Number(String($('#quoteAmount')?.value || '').replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));
  const quote = () => ({type:$('.segmented [data-quote-type].is-active')?.dataset.quoteType || 'freehold',currency:$('[data-invoice-currency].is-active')?.dataset.invoiceCurrency || 'thb',amount_bucket:bucket(amount())});
  const sectionOf = element => element?.closest('section')?.id || (element?.closest('.hero-campaign') ? 'hero' : element?.closest('.final-section') ? 'final' : element?.closest('footer') ? 'footer' : 'other');
  const placementOf = element => allowed.placement.includes(sectionOf(element)) ? sectionOf(element) : 'other';
  const methodNames = ['rub','sbp','cash','usdt'], stageNames = ['invoice','payment','confirmation'];

  // Capture the same persisted attribution keys used by the homepage and contact-attribution.js.
  const query = new URLSearchParams(location.search);
  let utms = {};
  try { utms = JSON.parse(localStorage.getItem('grusha_utms') || '{}') || {}; } catch { utms = {}; }
  if (typeof utms !== 'object' || Array.isArray(utms)) utms = {};
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content']) {
    if (query.get(key)) utms[key] = query.get(key).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,64);
  }
  try {
    localStorage.setItem('grusha_utms',JSON.stringify(utms));
    for (const key of ['ref','fbclid']) if (query.get(key)) localStorage.setItem('grusha_'+key,query.get(key).replace(/[^A-Za-z0-9_-]/g,'').slice(0,64));
  } catch { /* direct links still work without storage */ }
  const saved = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
  function telegramStart(placement) {
    const cleanValue = value => String(value).replace(/[^A-Za-z0-9]/g,'');
    const cleanMeta = value => String(value).replace(/[^A-Za-z0-9_-]/g,'');
    const fbclid = saved('grusha_fbclid'), ref = saved('grusha_ref');
    if (fbclid) return `${cleanMeta(utms.utm_content || 'direct')}__${cleanMeta(fbclid)}`.slice(0,64);
    if (ref) return `ref__${cleanValue(ref)}_${placement}`.slice(0,64);
    return `utm_source__${cleanValue(utms.utm_source || 'website')}_${placement}`.slice(0,64);
  }
  const tg = $('#contactDialog a[href*="Grushath_bot"]');
  if (tg) tg.href = 'https://t.me/Grushath_bot?start=' + telegramStart('agents');

  // Engagement is measured once, after actual visible time. No initial resize or animation events.
  let visibleMs = 0, lastVisible = canRecord() && document.visibilityState === 'visible' ? Date.now() : 0, engaged = false;
  document.addEventListener('visibilitychange', () => {
    if (lastVisible && canRecord()) visibleMs += Date.now() - lastVisible;
    lastVisible = canRecord() && document.visibilityState === 'visible' ? Date.now() : 0;
  });
  const engagementTimer = setInterval(() => {
    if (engaged) { clearInterval(engagementTimer); return; }
    if (!canRecord()) { visibleMs=0; lastVisible=0; return; }
    if (!lastVisible && document.visibilityState === 'visible') lastVisible=Date.now();
    if (visibleMs + (lastVisible ? Date.now()-lastVisible : 0) >= 5000) { engaged = !!emit('ag_page_engaged',{section:'hero'}); if (engaged) clearInterval(engagementTimer); }
  },1000);
  const sectionSeen = new Set(), sectionTimers = new Map();
  const sections = [['hero',$('.hero-campaign')],...['routes','calculator','methods','process','earnings','cabinet','format','documents','faq'].map(id => [id,$('#'+id)]),['final',$('.final-section')]];
  function scheduleSection(id,anchor) {
    if (sectionSeen.has(id) || sectionTimers.has(id) || !canRecord()) return;
    sectionTimers.set(id,setTimeout(() => {
      const rect=anchor.getBoundingClientRect();
      if (rect.bottom>0 && rect.top<innerHeight && document.visibilityState==='visible' && canRecord()) {
        if (emit('ag_section_view',{section:id})) sectionSeen.add(id);
      }
      sectionTimers.delete(id);
    },1500));
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const id = entry.target.dataset.analyticsSection;
    if (entry.isIntersecting) scheduleSection(id,entry.target);
    else if (sectionTimers.has(id)) { clearTimeout(sectionTimers.get(id)); sectionTimers.delete(id); }
  }),{threshold:.35});
  const sectionAnchors=sections.filter(([,el])=>!!el).map(([id,el])=>{const anchor=el.querySelector('h1,h2')||el;anchor.dataset.analyticsSection=id;observer.observe(anchor);return [id,anchor]});
  function resetConsentClock() {
    visibleMs=0; lastVisible=canRecord() && document.visibilityState==='visible'?Date.now():0;
    sectionAnchors.forEach(([id,anchor])=>{const r=anchor.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)scheduleSection(id,anchor)});
  }
  document.addEventListener('click',event=>{if(event.target.closest('#gc-consent [data-gc]'))setTimeout(resetConsentClock,0)});
  window.addEventListener('storage',event=>{if(event.key==='grusha_consent')resetConsentClock()});

  // App handlers run before these document bubble listeners; quote result state is settled here.
  document.addEventListener('submit',event => {
    if (event.target?.id !== 'quoteForm') return;
    queueMicrotask(() => emit($('#quoteError')?.hidden ? 'ag_quote_submit' : 'ag_quote_invalid',{...quote(),result:$('#quoteError')?.hidden ? 'success':'invalid'}));
  });
  document.addEventListener('click',event => {
    const target = event.target;
    const type = target.closest('[data-quote-type]');
    if (type) emit('ag_quote_option',{type:type.dataset.quoteType,currency:quote().currency});
    const currency = target.closest('[data-invoice-currency]');
    if (currency && !currency.disabled) emit('ag_quote_option',{...quote(),currency:currency.dataset.invoiceCurrency});
    const method = target.closest('[data-method]');
    if (method) { const name=methodNames[Number(method.dataset.method)]; emit('ag_method_select',{method:name,trigger:event.detail===0?'keyboard':'click'}); emit('ag_conditions_view',{method:name,action:'open',trigger:event.detail===0?'keyboard':'click'}); }
    const carousel = target.closest('[data-method-prev],[data-method-next]');
    if (carousel) emit('ag_method_carousel',{action:carousel.hasAttribute('data-method-prev')?'prev':'next',method:methodNames[Number($('#methods')?.dataset.carouselIndex || 0)]});
    const stage = target.closest('[data-process]');
    if (stage) { const trigger=event.detail===0?'keyboard':'click'; lastStageTrigger=trigger; emit('ag_process_select',{stage:stageNames[Number(stage.dataset.process)],trigger}); scheduleStageView(trigger); }
    const doc = target.closest('[data-doc]');
    if (doc) emit('ag_document_open',{document:doc.dataset.doc,section:sectionOf(doc)});
    const contract = target.closest('#documents a.document-link');
    if (contract) emit('ag_document_open',{document:contract.textContent.includes('Freehold')?'contract_freehold':'contract_leasehold',section:'documents'});
    const faq = target.closest('.faq-items summary');
    if (faq && !faq.parentElement.open) emit('ag_faq_open',{question:String([...document.querySelectorAll('.faq-items details')].indexOf(faq.parentElement)+1)});
    const video = target.closest('#cabinetPlayback');
    if (video) queueMicrotask(() => emit('ag_video_action',{action:$('#cabinetVideo')?.paused?'pause':'play',section:'cabinet'}));
    const contact = target.closest('[data-contact],[data-shared-contact],#quoteNext');
    if (contact) {
      const placement = contact.hasAttribute('data-shared-contact') ? 'header' : placementOf(contact);
      window.__agentsContactPlacement=placement;
      emit('ag_contact_open',{placement,section:placement,type:placement==='calculator'?quote().type:undefined});
    }
    const channel = target.closest('#contactDialog .contact-channels a');
    if (channel) emit('ag_contact_channel',{channel:channel.href.includes('Grushath_bot')?'tg':'wa',placement:window.__agentsContactPlacement || 'other',type:$('#contactQuote')?.hidden ? undefined : quote().type});
    const link = target.closest('a[href]');
    if (link && !link.closest('#contactDialog') && !link.closest('#docDialog')) {
      let destination;
      if (link.hash === '#calculator') destination='calculator';
      else if (link.hash === '#documents' || link.hash === '#registrationDocuments') destination='documents';
      else if (link.pathname === '/') destination='home';
      else if (link.pathname === '/agents/') destination='agents';
      else if (link.origin !== location.origin) destination='external';
      if (destination) emit('ag_navigation',{destination,section:sectionOf(link)});
    }
  });
  document.addEventListener('keydown',event => {
    const stage=event.target.closest('[data-process]');
    if (!stage || !['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    lastStageTrigger='keyboard';
    queueMicrotask(() => { emit('ag_process_select',{stage:stageNames[Number($('#process')?.dataset.activeProcess)],trigger:'keyboard'}); scheduleStageView('keyboard'); });
  });
  const cards=$('#methodCards'); let dragX=null, dragScroll=0, dragMoved=false, swipeTimer;
  cards?.addEventListener('pointerdown',event => { if (event.pointerType !== 'mouse') { dragX=event.clientX; dragScroll=cards.scrollLeft; dragMoved=false; } },{passive:true});
  cards?.addEventListener('pointermove',event => { if (dragX !== null && Math.abs(event.clientX-dragX)>24) dragMoved=true; },{passive:true});
  cards?.addEventListener('scroll',() => { if (!dragMoved || Math.abs(cards.scrollLeft-dragScroll)<30) return; clearTimeout(swipeTimer); swipeTimer=setTimeout(() => { if (dragMoved) emit('ag_method_carousel',{action:'swipe',method:methodNames[Number($('#methods')?.dataset.carouselIndex || 0)]}); dragX=null; dragMoved=false; },180); },{passive:true});
  const hovered=new Set();
  document.querySelectorAll('[data-method-item]').forEach(card => card.addEventListener('pointerenter',event => {
    if (event.pointerType!=='mouse' || !matchMedia('(hover:hover)').matches) return;
    const index=Number(card.dataset.methodItem), name=methodNames[index];
    setTimeout(() => { if (card.matches(':hover') && $('#methods')?.dataset.activeMethod===String(index) && !hovered.has(index)) { hovered.add(index); emit('ag_method_select',{method:name,trigger:'hover'}); emit('ag_conditions_view',{method:name,action:'open',trigger:'hover'}); } },180);
  },true));
  let earnTimer;
  const countBucket = n => !Number.isFinite(n)||n<0?'invalid':n===0?'zero':n===1?'one':n<=5?'two_five':'six_plus';
  function earnings() {
    clearTimeout(earnTimer); earnTimer=setTimeout(() => {
      const n=Number($('#earnCount')?.value), value=Number(String($('#earnAmount')?.value || '').replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));
      emit('ag_earnings_use',{count_bucket:countBucket(n),amount_bucket:bucket(value),result:$('#earnError')?.hidden?'success':'invalid'});
    },500);
  }
  ['earnCount','earnAmount'].forEach(id => $('#'+id)?.addEventListener('input',earnings));
  document.addEventListener('click',event => { if (event.target.closest('[data-earn-option]')) earnings(); });
  $('#sourceSelect')?.addEventListener('change',event => emit('ag_source_select',{source:event.target.value}));
  const video=$('#cabinetVideo'); let videoCompleted=false;
  video?.addEventListener('timeupdate',() => { if (video.currentTime<2) videoCompleted=false; if (!videoCompleted && Number.isFinite(video.duration) && video.duration>0 && video.currentTime>=video.duration-.5) { videoCompleted=true; emit('ag_video_action',{action:'end',section:'cabinet'}); } });
  const process=$('#process'); let lastScrollAt=0, lastStageTrigger='scroll', stageTimer;
  const stagesSeen=new Set();
  function scheduleStageView(trigger) {
    clearTimeout(stageTimer);
    stageTimer=setTimeout(() => {
      const index=Number(process?.dataset.activeProcess), stage=stageNames[index], rect=process?.getBoundingClientRect();
      if (!stage || stagesSeen.has(stage) || !rect || rect.bottom<=0 || rect.top>=innerHeight || document.visibilityState!=='visible') return;
      if (trigger==='scroll' && Date.now()-lastScrollAt>2200) return;
      stagesSeen.add(stage); emit('ag_process_stage_view',{stage,trigger});
    },850);
  }
  window.addEventListener('scroll',event => { if (!event.isTrusted) return; lastScrollAt=Date.now(); if (process) scheduleStageView(lastStageTrigger==='click'||lastStageTrigger==='keyboard'?lastStageTrigger:'scroll'); lastStageTrigger='scroll'; },{passive:true});
  if (process) new MutationObserver(() => { if (Date.now()-lastScrollAt<2200 || lastStageTrigger!=='scroll') scheduleStageView(lastStageTrigger); }).observe(process,{attributes:true,attributeFilter:['data-active-process']});
})();
