const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
const parseAmount=v=>{const s=String(v).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');return s&&/^\d+(?:\.\d+)?$/.test(s)?Number(s):NaN};
function setButtons(selector,active,predicate){$$(selector).forEach(b=>{const yes=predicate(b)===active;b.classList.toggle('is-active',yes);if(b.hasAttribute('aria-selected'))b.setAttribute('aria-selected',String(yes));if(b.hasAttribute('aria-pressed'))b.setAttribute('aria-pressed',String(yes))})}

const quoteRates=Object.freeze({cbrRubUsd:82.9803,cbrDate:'13.11.2026',exampleThbPerUsd:33.69,minFreeholdMarkup:.045,exampleLeaseRubPerThb:2.60});
const fmtQuote=(n,digits=2)=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n);
const fmtQuoteAmount=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
let quoteType='freehold',invoiceCurrency='thb',quoteSnapshot=null;
function clearQuote(){quoteSnapshot=null;$('#quoteResult').hidden=true;$('#quoteNext').hidden=true;$('.quote-submit').hidden=false;$('#quoteError').hidden=true}
function updateQuoteControls(){
  setButtons('[data-quote-type]',quoteType,b=>b.dataset.quoteType);
  const leasehold=quoteType==='leasehold';
  if(leasehold)invoiceCurrency='thb';
  $('#invoiceCurrencyChoices').hidden=leasehold;
  $('#leaseholdCurrency').hidden=!leasehold;
  $$('[data-invoice-currency]').forEach(b=>{b.disabled=leasehold;const active=b.dataset.invoiceCurrency===invoiceCurrency;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});
  clearQuote();
}
$$('[data-quote-type]').forEach(b=>b.addEventListener('click',()=>{quoteType=b.dataset.quoteType;updateQuoteControls()}));
$$('[data-invoice-currency]').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;invoiceCurrency=b.dataset.invoiceCurrency;updateQuoteControls()}));
$('#quoteAmount').addEventListener('input',clearQuote);
$('#quoteForm').addEventListener('submit',e=>{
  e.preventDefault();
  const currency=invoiceCurrency.toUpperCase(),amount=parseAmount($('#quoteAmount').value),err=$('#quoteError');
  if(!Number.isFinite(amount)||amount<=0){err.textContent=`Введите сумму инвойса больше нуля в ${currency}.`;err.hidden=false;clearQuote();err.hidden=false;$('#quoteAmount').focus();return}
  err.hidden=true;
  const isFreehold=quoteType==='freehold',isThb=currency==='THB';
  let clientRate,total,rateUnit,rateContext='';
  if(isFreehold){
    const rubPerUsd=quoteRates.cbrRubUsd*(1+quoteRates.minFreeholdMarkup);
    clientRate=isThb?rubPerUsd/quoteRates.exampleThbPerUsd:rubPerUsd;
    total=amount*clientRate;
    rateUnit=isThb?'₽ за ฿1':'₽ за $1';
    rateContext='<p class="quote-result-note">Все расходы на SWIFT и ваше вознаграждение включены в курс.</p>';
  }else{
    clientRate=quoteRates.exampleLeaseRubPerThb;
    total=amount*clientRate;
    rateUnit='₽ за ฿1';
  }
  $('#quoteResult').innerHTML=`<span class="quote-result-heading">Предварительный расчёт</span><p class="quote-client-rate">Курс: <b>${isFreehold?'от ':''}${fmtQuote(clientRate,5)} ${rateUnit}</b></p><span class="quote-result-label">Покупателю к оплате${isFreehold?' — от':''}</span><strong class="quote-buyer-total">${fmtQuote(total)} ₽</strong><p class="quote-invoice-line">Застройщику по инвойсу <b>${fmtQuoteAmount(amount)} ${currency}</b></p><div class="quote-result-separator"></div><p class="quote-agent-line"><span>Ваше вознаграждение · 1%</span><strong>${fmtQuoteAmount(amount*.01)} ${currency}</strong></p>${rateContext}`;
  quoteSnapshot={type:quoteType,amount,currency,total};
  $('#quoteResult').hidden=false;$('#quoteNext').hidden=false;$('.quote-submit').hidden=true;
});
$('#quoteNext').addEventListener('click',()=>{
  if(!quoteSnapshot)return;
  openContact(quoteSnapshot);
});

const methods=[{title:'Рубли по реквизитам',body:'Подходят для крупных платежей. До перевода подготовим договор и согласуем документы, подтверждающие источник средств.',bullets:['Получатель и сумма — по банковским реквизитам','ИПДС: источник происхождения денежных средств','Полный комплект согласуется до внесения средств']},{title:'СБП',body:'Удобно для небольших платежей и аренды. Применимость к вашей сделке уточнит менеджер до оплаты.',bullets:['Реквизиты и лимиты — в инструкции по оплате','Маршрут подтверждаем по инвойсу']},{title:'Наличные',body:'Возможность приёма в 55 городах России. Менеджер уточнит доступность и документы для вашей сделки.',bullets:['Согласуем город и порядок внесения','Подтверждение оплаты — по выбранному маршруту']},{title:'USDT',body:'Получите предварительный расчёт. До перевода проверим кошелёк и направим инструкцию с сетью и адресом.',bullets:['Проверка кошелька до отправки','Сеть и адрес только в инструкции по сделке']}];
const methodSection=$('#methods'),methodCards=$('#methodCards'),methodButtons=$$('[data-method]'),methodItems=$$('[data-method-item]');
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let activeMethod=null,methodRevealTimer=0,methodRevealSerial=0;
function measureMethodPanel(){
  if(window.innerWidth<=900)return;
  const gap=parseFloat(getComputedStyle(methodCards).columnGap)||0;
  const cardWidth=(methodCards.clientWidth-gap*(methodItems.length-1))*3/(methodItems.length+2);
  methodCards.style.setProperty('--method-open-copy-width',`${Math.min(640,Math.max(0,cardWidth-32))}px`);
}
function finishMethodReveal(i,serial=methodRevealSerial){
  if(serial!==methodRevealSerial||activeMethod!==i)return;
  clearTimeout(methodRevealTimer);methodItems[i].classList.add('is-copy-ready');
}

function measureMethodPills(){
  methodItems.forEach(card=>{
    const title=card.querySelector('h3'),range=document.createRange();range.selectNodeContents(title);
    card.style.setProperty('--method-closed-width',`${Math.ceil(range.getBoundingClientRect().width+28)}px`);
  });
}
function updateMethodRowHeight(){
  if(window.innerWidth<=900){methodCards.style.removeProperty('--method-row-height');return;}
  const base=methodCards.clientWidth/3;
  const active=activeMethod>=0?methodItems[activeMethod]:null;
  const captionHeight=active?.querySelector('.method-card-copy').getBoundingClientRect().height||0;
  methodCards.style.setProperty('--method-row-height',`${Math.ceil(Math.max(base,captionHeight+82))}px`);
}
function chooseMethod(i){
  if(i===activeMethod)return;
  clearTimeout(methodRevealTimer);const serial=++methodRevealSerial;
  const immediate=window.innerWidth<=900||motionPreference.matches||i>=0&&methodButtons[i].matches(':focus-visible');
  methodSection.classList.toggle('method-instant',immediate);measureMethodPanel();
  activeMethod=i;methodSection.dataset.activeMethod=String(i);
  setButtons('[data-method]',String(i),button=>button.dataset.method);
  methodItems.forEach((card,n)=>{
    card.classList.toggle('is-active',n===i);
    card.classList.toggle('is-copy-ready',n===i&&immediate);
    methodButtons[n].setAttribute('aria-expanded',String(window.innerWidth<=900||n===i));
  });
  if(window.innerWidth<=900&&i>=0)scrollMethodTo(i);
  if(i>=0&&!immediate)methodRevealTimer=setTimeout(()=>finishMethodReveal(i,serial),760);
  requestAnimationFrame(updateMethodRowHeight);
}
function scrollMethodTo(i){
  const left=methodItems[i].getBoundingClientRect().left-methodCards.getBoundingClientRect().left+methodCards.scrollLeft;
  methodCards.scrollTo({left,behavior:motionPreference.matches?'instant':'smooth'});
}
function updateMethodCarousel(){
  if(window.innerWidth>900)return;
  const left=methodCards.getBoundingClientRect().left;
  const atEnd=methodCards.scrollLeft>=methodCards.scrollWidth-methodCards.clientWidth-2;
  const i=atEnd?methodItems.length-1:methodItems.reduce((best,card,n)=>Math.abs(card.getBoundingClientRect().left-left)<Math.abs(methodItems[best].getBoundingClientRect().left-left)?n:best,0);
  $('[data-method-position]').textContent=`${i+1} / ${methodItems.length}`;
  $('[data-method-prev]').disabled=i===0;$('[data-method-next]').disabled=i===methodItems.length-1;
  methodSection.dataset.carouselIndex=String(i);
}
methodCards.addEventListener('scroll',updateMethodCarousel,{passive:true});
$('[data-method-prev]').addEventListener('click',()=>scrollMethodTo(Math.max(0,Number(methodSection.dataset.carouselIndex||0)-1)));
$('[data-method-next]').addEventListener('click',()=>scrollMethodTo(Math.min(methodItems.length-1,Number(methodSection.dataset.carouselIndex||0)+1)));
methodItems.forEach((card,i)=>{
  card.querySelector('[data-method-bullets]').innerHTML=`<ul>${methods[i].bullets.map(text=>`<li>${text}</li>`).join('')}</ul>`;
  card.querySelector('.method-card-description p').textContent=methods[i].body;
  card.parentElement.addEventListener('transitionend',event=>{
    if(event.target===card.parentElement&&event.propertyName==='flex-grow')finishMethodReveal(i);
  });

});
methodButtons.forEach((button,i)=>{
  button.addEventListener('click',()=>chooseMethod(i));
  button.addEventListener('focus',()=>chooseMethod(i));
  button.closest('.method-card').addEventListener('pointerenter',event=>{
    if(window.innerWidth<=900||event.pointerType!=='mouse'||!window.matchMedia('(hover:hover)').matches)return;
    const focused=methodButtons.find(candidate=>candidate===document.activeElement);
    if(focused&&focused!==button)return;
    chooseMethod(i);
  });
  button.addEventListener('keydown',event=>{
    if(event.key==='Tab'){chooseMethod(i);return;}
    let next=i;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=Math.min(3,i+1);
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=Math.max(0,i-1);
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=3;
    else return;
    event.preventDefault();methodButtons[next].focus({preventScroll:true});chooseMethod(next);
  });
});
methodCards.addEventListener('pointermove',event=>{
  if(window.innerWidth<=900||event.pointerType!=='mouse'||!window.matchMedia('(hover:hover)').matches)return;
  if(!event.movementX&&!event.movementY)return;
  const card=event.target.closest('[data-method-item]');
  if(card)chooseMethod(Number(card.dataset.methodItem));
});
function releaseMethod(){
  if(window.innerWidth<=900||methodSection.matches(':hover')||methodSection.matches(':focus-within')||document.querySelector('dialog[open]'))return;
  chooseMethod(-1);
}
methodSection.addEventListener('pointerleave',releaseMethod);
methodSection.addEventListener('focusout',()=>setTimeout(releaseMethod,0));
function syncMethodMode(){
  measureMethodPanel();measureMethodPills();
  if(window.innerWidth<=900&&activeMethod<0)chooseMethod(0);
  else if(window.innerWidth>900&&activeMethod>=0)releaseMethod();
  methodButtons.forEach((button,i)=>button.setAttribute('aria-expanded',String(window.innerWidth<=900||i===activeMethod)));
  updateMethodCarousel();updateMethodRowHeight();
}
chooseMethod(-1);syncMethodMode();window.addEventListener('resize',syncMethodMode,{passive:true});
if(document.fonts)document.fonts.ready.then(syncMethodMode);
new ResizeObserver(updateMethodRowHeight).observe(methodCards);
methodItems.forEach(card=>new ResizeObserver(updateMethodRowHeight).observe(card.querySelector('.method-card-copy')));

const dealSection=$('#process'),dealIntro=$('.deal-intro'),dealTrack=$('#dealScrollTrack'),dealStage=$('#dealStage'),dealStageContent=$('#dealStageContent');
const dealMedia=$('#processFeatureMedia'),dealChoices=$('.deal-choices'),dealFrames=$$('[data-deal-frame]'),dealBodies=$$('[data-deal-body]'),dealBodyInners=$$('.deal-body-inner'),dealButtons=$$('[data-process]');
const dealItems=$$('[data-process-item]');
const dealMobileMedia=dealItems.map((item,i)=>{
  const media=document.createElement('div');
  media.className='deal-mobile-media';media.setAttribute('aria-hidden','true');
  const progress=document.createElement('div');progress.className='deal-mobile-progress';
  progress.innerHTML=dealFrames.map((_,n)=>`<span${n===i?' class="is-current"':''}></span>`).join('');
  const heading=document.createElement('h3');heading.className='deal-mobile-heading';heading.textContent=dealButtons[i].textContent;
  media.append(progress);item.prepend(media,heading);return media;
});
const mobileDeal=()=>window.innerWidth<=780;
let activeDeal=-1,dealActiveMobile=null,dealScrollFrame=0,dealBodyHeights=[0,0,0];
const clamp01=value=>Math.max(0,Math.min(1,value));
function measureDealBodies(){
  dealBodyHeights=dealBodyInners.map(inner=>Math.ceil(inner.getBoundingClientRect().height));
  const headingHeight=dealButtons.reduce((sum,button)=>sum+button.getBoundingClientRect().height,0);
  const margins=$$('[data-process-item]').reduce((sum,item)=>sum+parseFloat(getComputedStyle(item).marginBottom),0);
  dealSection.style.setProperty('--deal-choices-height',`${Math.ceil(headingHeight+margins+Math.max(...dealBodyHeights))}px`);
}
function dealScrollEnabled(){return !dealSection.classList.contains('deal-no-pin')&&!motionPreference.matches;}
function dealGeometry(){const header=window.innerWidth<=780?64:72;return {top:dealTrack.getBoundingClientRect().top+scrollY-header,travel:Math.max(1,dealTrack.offsetHeight-dealStage.offsetHeight)};}
function setDealActive(i){
  const mobile=mobileDeal();
  if(i===activeDeal&&mobile===dealActiveMobile)return;
  dealActiveMobile=mobile;
  activeDeal=i;dealSection.dataset.activeProcess=String(i);dealMedia.dataset.phase=String(i);
  dealButtons.forEach((button,n)=>{
    const selected=n===i,body=dealBodies[n],expanded=mobile||selected;
    button.setAttribute('aria-expanded',String(expanded));
    if(selected)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    const heading=dealItems[n].querySelector('.deal-mobile-heading');
    if(selected)heading.setAttribute('aria-current','step');else heading.removeAttribute('aria-current');
    dealItems[n].classList.toggle('is-active',selected);
    body.setAttribute('aria-hidden',String(!expanded));
    body.inert=!expanded;
  });
}
function paintDeal(position,staticMode=false){
  const value=Math.max(0,Math.min(2,position)),selected=Math.round(value);
  dealSection.dataset.dealPosition=String(value);
  setDealActive(selected);
  if(mobileDeal()){
    dealFrames.forEach(frame=>{frame.style.transform='none';frame.style.opacity='1';frame.style.zIndex='1';});
    dealBodies.forEach(body=>{body.style.height='auto';body.style.opacity='1';});
    dealButtons.forEach(button=>{button.style.color='rgb(17,21,19)';});
    return;
  }
  const base=Math.min(1,Math.floor(value)),fraction=value-base;
  dealFrames.forEach((frame,i)=>{
    let transform='translateY(100%)',opacity=1,zIndex=1;
    if(staticMode){if(i===selected){transform='translateY(0) scale(1)';zIndex=6;}else opacity=0;}
    else if(i<base){transform='translateY(0) scale(.7)';opacity=0;}
    else if(i===base){transform=`translateY(0) scale(${1-.3*fraction})`;opacity=1-fraction;zIndex=5;}
    else if(i===base+1){transform=`translateY(${(1-fraction)*100}%) scale(1)`;zIndex=6;}
    frame.style.transform=transform;frame.style.opacity=String(opacity);frame.style.zIndex=String(zIndex);
  });
  // Keep the selected explanation readable throughout the image transition.
  // Hidden explanations must not reserve empty space between the headings.
  dealBodies.forEach((body,i)=>{
    body.style.height=i===selected?'auto':'0px';
    body.style.opacity=i===selected?'1':'0';
  });
  dealButtons.forEach((button,i)=>{
    button.style.color=i===selected?'rgb(17,21,19)':'rgb(133,141,134)';
  });
}
function syncDealFromScroll(){
  dealScrollFrame=0;
  if(mobileDeal()){
    // Read from stable document positions; scrolling never changes their height.
    const readingLine=64+Math.min(220,(window.innerHeight-64)*.35);
    let selected=0;
    dealItems.forEach((item,i)=>{if(item.getBoundingClientRect().top<=readingLine)selected=i;});
    if(selected!==activeDeal)paintDeal(selected,true);
    return;
  }
  if(!dealScrollEnabled())return;
  const {top,travel}=dealGeometry();
  paintDeal(clamp01((scrollY-top)/travel)*2);
}
function requestDealSync(){if(!dealScrollFrame)dealScrollFrame=requestAnimationFrame(syncDealFromScroll);}
function updateDealLayout(){
  dealSection.classList.toggle('deal-mobile-flow',mobileDeal());
  if(window.innerWidth>780){if(dealIntro.parentElement!==dealStageContent)dealStageContent.prepend(dealIntro);}
  else if(dealIntro.parentElement!==dealSection)dealSection.insertBefore(dealIntro,dealTrack);
  dealFrames.forEach((frame,i)=>{
    const parent=mobileDeal()?dealMobileMedia[i]:dealMedia;
    if(frame.parentElement!==parent)parent.append(frame);
  });
  if(mobileDeal()){
    dealSection.classList.add('deal-no-pin');
    dealSection.style.setProperty('--deal-scroll-distance','0px');
    paintDeal(Math.max(0,activeDeal),true);requestDealSync();return;
  }
  paintDeal(Math.max(0,activeDeal),true);
  measureDealBodies();
  const header=window.innerWidth<=780?64:72;
  // Measure the largest explanation without temporarily changing sticky mode.
  dealChoices.style.minHeight='var(--deal-choices-height)';
  const pinnedHeight=dealStageContent.scrollHeight;
  dealChoices.style.removeProperty('min-height');
  const noPin=motionPreference.matches||window.innerHeight<=740||pinnedHeight>window.innerHeight-header-8;
  dealSection.classList.toggle('deal-no-pin',noPin);
  const stageHeight=Math.ceil(dealStageContent.scrollHeight+parseFloat(getComputedStyle(dealStage).paddingTop));
  const stepDistance=Math.round(Math.min(320,Math.max(180,dealMedia.offsetHeight*.5)));
  dealSection.style.setProperty('--deal-stage-height',`${stageHeight}px`);
  dealSection.style.setProperty('--deal-scroll-distance',`${noPin?0:stepDistance*(dealFrames.length-1)}px`);
  if(noPin)paintDeal(Math.max(0,activeDeal),true);
  else requestDealSync();
}
function chooseDeal(i,moveScroll=false){
  if(mobileDeal()){
    paintDeal(i,true);
    return;
  }
  if(moveScroll&&dealScrollEnabled()){
    const {top,travel}=dealGeometry();
    window.scrollTo({left:0,top:Math.round(top+travel*i/2),behavior:'smooth'});
    return;
  }
  paintDeal(i,true);updateDealLayout();
}
dealButtons.forEach((button,i)=>{
  button.addEventListener('click',()=>chooseDeal(i,true));
  button.addEventListener('keydown',event=>{
    let next=i;
    if(event.key==='ArrowDown')next=Math.min(2,i+1);
    else if(event.key==='ArrowUp')next=Math.max(0,i-1);
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=2;
    else if(event.key==='Enter'||event.key===' ')return;
    else return;
    event.preventDefault();dealButtons[next].focus({preventScroll:true});chooseDeal(next,true);
  });
});
window.addEventListener('scroll',requestDealSync,{passive:true});
window.addEventListener('resize',updateDealLayout,{passive:true});
motionPreference.addEventListener('change',updateDealLayout);
paintDeal(0,true);updateDealLayout();
if(document.fonts)document.fonts.ready.then(updateDealLayout);
$('.process-documents-link').addEventListener('click',()=>{$('#registrationDocuments').open=true});

function renderEarn(){let count=parseAmount($('#earnCount').value),amount=parseAmount($('#earnAmount').value),err=$('#earnError');if(!Number.isFinite(count)||!Number.isInteger(count)||count<0||!Number.isFinite(amount)||amount<0){err.textContent='Введите неотрицательное число оплат и сумму в THB.';err.hidden=false;$('#earnResult').innerHTML='<span class="earn-result-number">—</span><span class="earn-result-unit">THB</span>';return}err.hidden=true;$('#earnResult').innerHTML='<span class="earn-result-number">'+fmt(count*amount*.01)+'</span><span class="earn-result-unit">THB</span>'}['earnCount','earnAmount'].forEach(id=>$('#'+id).addEventListener('input',renderEarn));

const earnInput=$('#earnCount'),earnOptions=$('#earnCountOptions'),earnToggle=$('#earnCountToggle');let earnActive=-1;
earnOptions.innerHTML=Array.from({length:10},(_,i)=>`<button type="button" role="option" id="earnOption${i+1}" data-earn-option="${i+1}" aria-selected="false">${i+1}</button>`).join('');
function setEarnActive(i){earnActive=i;$$('[data-earn-option]').forEach((b,n)=>{b.classList.toggle('is-active',n===i);b.setAttribute('aria-selected',String(n===i))});if(i>=0)earnInput.setAttribute('aria-activedescendant',`earnOption${i+1}`);else earnInput.removeAttribute('aria-activedescendant')}
function toggleEarnOptions(open){earnOptions.hidden=!open;earnInput.setAttribute('aria-expanded',String(open));earnToggle.setAttribute('aria-expanded',String(open));if(open){const match=Number(earnInput.value);setEarnActive(Number.isInteger(match)&&match>=1&&match<=10?match-1:-1)}else setEarnActive(-1)}
function chooseEarn(value){earnInput.value=String(value);renderEarn();earnInput.focus();toggleEarnOptions(false)}
earnToggle.addEventListener('click',()=>{toggleEarnOptions(earnOptions.hidden);earnInput.focus()});
earnInput.addEventListener('focus',()=>toggleEarnOptions(true));
earnInput.addEventListener('input',()=>{if(!earnOptions.hidden){const value=earnInput.value.trim(),n=Number(value);setEarnActive(/^\d+$/.test(value)&&n>=1&&n<=10?n-1:-1)}});
earnInput.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleEarnOptions(false);return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(earnOptions.hidden)toggleEarnOptions(true);setEarnActive(earnActive<0?(e.key==='ArrowDown'?0:9):(earnActive+(e.key==='ArrowDown'?1:9))%10)}else if(e.key==='Enter'&&!earnOptions.hidden){e.preventDefault();if(earnActive>=0)chooseEarn(earnActive+1);else toggleEarnOptions(false)}});
earnOptions.addEventListener('click',e=>{const b=e.target.closest('[data-earn-option]');if(b){e.preventDefault();chooseEarn(Number(b.dataset.earnOption))}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.earn-count-wrap'))toggleEarnOptions(false)});

const sources={
  property:['Договор купли-продажи с подписями сторон','Выписка ЕГРН','Выписка о поступлении денег и остатке до перевода','Пояснение об источнике средств'],
  car:['Договор купли-продажи автомобиля','Выписка о поступлении денег и остатке до перевода'],
  business:['Декларация за прошлый год','КУДиР за текущий год','Справки о принадлежности сумм ЕНП'],
  salary:['Справка о доходах и суммах налога физического лица (бывшая 2-НДФЛ) за период, из которого сформирована сумма оплаты','Выписка по счёту с зачислениями зарплаты и остатком до перевода','Если деньги переводились между своими счетами — выписки по всей цепочке'],
  deposit_interest:['Договор банковского вклада или условия накопительного счёта','Выписка с начислением и выплатой процентов','Выписка о переводе дохода на счёт оплаты и остатке до перевода'],
  savings:['Документы о первоначальном источнике накоплений: зарплата, продажа имущества или другой доход','Выписки о внесении денег на вклад и дальнейшем движении средств','Выписка о снятии или закрытии вклада и остатке на счёте до оплаты'],
  other:['Менеджер уточнит документы по вашему источнику средств']
};
const sourceCommonNote='Ориентир для подготовки. Комплект документов и период выписок менеджер согласует по вашей сделке.';
const sourceNotes={salary:sourceCommonNote,deposit_interest:'Если оплачиваете и основной суммой вклада, подтвердите также её первоначальный источник. '+sourceCommonNote,savings:sourceCommonNote};
function renderSources(){
  const source=$('#sourceSelect').value,note=sourceNotes[source]||'';
  $('#sourceList').innerHTML=sources[source].map(s=>`<li>${s}</li>`).join('');
  $('#sourceNote').textContent=note;$('#sourceNote').hidden=!note;
}
renderSources();$('#sourceSelect').addEventListener('change',renderSources);

// Enhance the native fallback with the same menu on every platform.
const sourceSelect=$('#sourceSelect'),sourcePicker=$('.source-picker'),sourceButton=$('#sourcePickerButton'),sourceOptions=$('#sourceOptions'),sourceValue=$('#sourcePickerValue');
const sourceChoices=[...sourceSelect.options];
let sourceActive=sourceSelect.selectedIndex,sourceTypeBuffer='',sourceTypedAt=0;
sourceOptions.replaceChildren(...sourceChoices.map((choice,i)=>{
  const option=document.createElement('li');option.id=`sourceOption${i}`;option.dataset.sourceIndex=String(i);option.setAttribute('role','option');option.textContent=choice.textContent;return option;
}));
const sourceOptionItems=[...sourceOptions.children];
function syncSourcePicker(){
  sourceValue.textContent=sourceChoices[sourceSelect.selectedIndex].textContent;
  sourceOptionItems.forEach((option,i)=>option.setAttribute('aria-selected',String(i===sourceSelect.selectedIndex)));
}
function setSourceActive(i,scroll=true){
  sourceActive=Math.max(0,Math.min(sourceChoices.length-1,i));
  sourceOptionItems.forEach((option,n)=>option.classList.toggle('is-active',n===sourceActive));
  sourceButton.setAttribute('aria-activedescendant',sourceOptionItems[sourceActive].id);
  if(scroll)sourceOptionItems[sourceActive].scrollIntoView({block:'nearest',behavior:'instant'});
}
function positionSourceOptions(){
  if(sourceOptions.hidden)return;
  const rect=sourceButton.getBoundingClientRect(),header=innerWidth<=780?64:72;
  if(rect.bottom<header||rect.top>innerHeight){closeSourceOptions(false);return;}
  const below=innerHeight-rect.bottom-16,above=rect.top-header-16;
  const upward=below<Math.min(360,sourceOptions.scrollHeight)&&above>below;
  sourceOptions.dataset.placement=upward?'above':'below';
  sourceOptions.style.maxHeight=`${Math.max(44,Math.min(360,upward?above:below))}px`;
}
function openSourceOptions(i=sourceSelect.selectedIndex){
  sourceOptions.hidden=false;sourceButton.setAttribute('aria-expanded','true');
  positionSourceOptions();setSourceActive(i);
}
function closeSourceOptions(commit=false){
  if(sourceOptions.hidden)return;
  if(commit){sourceSelect.selectedIndex=sourceActive;sourceSelect.dispatchEvent(new Event('change',{bubbles:true}));}
  sourceOptions.hidden=true;sourceButton.setAttribute('aria-expanded','false');sourceButton.removeAttribute('aria-activedescendant');sourceTypeBuffer='';
}
sourceButton.addEventListener('click',()=>sourceOptions.hidden?openSourceOptions():closeSourceOptions(false));
sourceButton.addEventListener('keydown',event=>{
  const open=!sourceOptions.hidden,key=event.key;
  if(key==='Escape'){if(open){event.preventDefault();closeSourceOptions(false);}return;}
  if(key==='Tab'){closeSourceOptions(true);return;}
  if(key==='Enter'||key===' '){event.preventDefault();open?closeSourceOptions(true):openSourceOptions();return;}
  if(['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(key)){
    event.preventDefault();
    if(event.altKey&&key==='ArrowUp'){closeSourceOptions(true);return;}
    if(!open)openSourceOptions();
    if(key==='Home'||key==='PageUp'||!open&&key==='ArrowUp')setSourceActive(0);
    else if(key==='End'||key==='PageDown')setSourceActive(sourceChoices.length-1);
    else if(open&&!event.altKey)setSourceActive(sourceActive+(key==='ArrowDown'?1:-1));
    return;
  }
  if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
    event.preventDefault();const now=Date.now();sourceTypeBuffer=now-sourceTypedAt>700?key:sourceTypeBuffer+key;sourceTypedAt=now;
    const letters=sourceTypeBuffer.toLocaleLowerCase('ru'),repeated=[...letters].every(c=>c===letters[0]),prefix=repeated?letters[0]:letters;
    const start=repeated?sourceActive+1:0;
    if(!open)openSourceOptions();
    for(let n=0;n<sourceChoices.length;n++){const i=(start+n)%sourceChoices.length;if(sourceChoices[i].textContent.toLocaleLowerCase('ru').startsWith(prefix)){setSourceActive(i);break;}}
  }
});
sourceOptions.addEventListener('pointerdown',event=>event.preventDefault());
sourceOptions.addEventListener('pointermove',event=>{const option=event.target.closest('[data-source-index]');if(option)setSourceActive(Number(option.dataset.sourceIndex),false);});
sourceOptions.addEventListener('click',event=>{const option=event.target.closest('[data-source-index]');if(!option)return;setSourceActive(Number(option.dataset.sourceIndex),false);closeSourceOptions(true);sourceButton.focus({preventScroll:true});});
sourceButton.addEventListener('blur',()=>closeSourceOptions(true));
document.addEventListener('pointerdown',event=>{if(!sourcePicker.contains(event.target))closeSourceOptions(false);});
window.addEventListener('resize',positionSourceOptions,{passive:true});window.addEventListener('scroll',positionSourceOptions,{passive:true});
sourceSelect.addEventListener('change',syncSourcePicker);
syncSourcePicker();sourceSelect.hidden=true;sourceButton.hidden=false;$('#sourceLabel').htmlFor='sourcePickerButton';


const docs={bank:['assets/freehold-bank-transfer-confirmation-rpm.jpg','Образец подтверждения перевода','Обезличенный образец. Данные отправителя и получателя скрыты.'],virtual:['assets/freehold-virtual-payment-slip-form.png','Образец формы платежа через виртуальный счёт','Образец формы. Не подтверждает исполнение конкретного платежа.'],registration:['assets/grusha-mf-registration-certificate.png','Регистрация MF Corporation','Регистрационный документ компании.'],advice:['assets/grusha-mf-payment-advice-anonymized.png','Образец банковского подтверждения','Обезличенный образец подтверждения оплаты.']};function openContact(quote){
  const summary=$('#contactQuote');
  summary.hidden=!quote;
  if(quote){
    const type=quote.type==='freehold'?'Freehold':'Leasehold';
    const invoice=`${fmtQuoteAmount(quote.amount)} ${quote.currency}`;
    const total=`${quote.type==='freehold'?'от ':''}${fmtQuote(quote.total)} ₽`;
    $('#contactType').textContent=type;
    $('#contactInvoice').textContent=invoice;
    $('#contactTotal').textContent=total;
    $('#contactWhatsApp').href=`https://wa.me/66618187132?text=${encodeURIComponent(`Здравствуйте! Хочу обсудить оплату по инвойсу: ${type}, ${invoice}. Предварительно к оплате ${total}.`)}`;
  }else{
    $('#contactType').textContent='';
    $('#contactInvoice').textContent='';
    $('#contactTotal').textContent='';
    $('#contactWhatsApp').href='https://wa.me/66618187132?text='+encodeURIComponent('Здравствуйте! Хочу обсудить оплату по инвойсу.');
  }
  openDialog($('#contactDialog'));
}
let returnFocus=null;function openDialog(dialog){returnFocus=document.activeElement;dialog.showModal();$('[data-close]',dialog).focus()}function openDoc(key){const [src,title,caption]=docs[key];$('#docImage').src=src;$('#docImage').alt=title;$('#docImage').classList.remove('is-zoomed');$('#docTitle').textContent=title;$('#docCaption').textContent=caption;openDialog($('#docDialog'))}$$('[data-doc]').forEach(b=>b.addEventListener('click',()=>openDoc(b.dataset.doc)));$$('[data-contact]').forEach(b=>b.addEventListener('click',()=>openContact()));$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));$$('dialog').forEach(d=>{d.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus()});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});d.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusables=$$('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]',d).filter(x=>x.offsetParent!==null);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}})});$('#docImage').addEventListener('click',e=>e.currentTarget.classList.toggle('is-zoomed'));$('#docImage').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.classList.toggle('is-zoomed')}});
// Shared site navigation is handled by /assets/shared/navigation.js

// Keep the cabinet explainer quiet and pause it outside the viewport.
const cabinetVideo=$('#cabinetVideo'),cabinetPlayback=$('#cabinetPlayback');
let cabinetManualPause=false,cabinetInView=false;
function updateCabinetPlayback(){
  const paused=cabinetVideo.paused;
  cabinetPlayback.setAttribute('aria-label',paused?'Смотреть ролик':'Пауза');
  cabinetPlayback.innerHTML=`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${paused?'<path d="m8 5 11 7-11 7V5Z"/>':'<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'}</svg>`;
}
function syncCabinetPlayback(){if(cabinetInView&&!cabinetManualPause&&!motionPreference.matches)cabinetVideo.play().catch(updateCabinetPlayback);else cabinetVideo.pause();}
cabinetVideo.addEventListener('play',updateCabinetPlayback);
cabinetVideo.addEventListener('pause',updateCabinetPlayback);
cabinetPlayback.addEventListener('click',()=>{if(cabinetVideo.paused){cabinetManualPause=false;cabinetVideo.play().catch(updateCabinetPlayback);}else{cabinetManualPause=true;cabinetVideo.pause();}});
new IntersectionObserver(entries=>{cabinetInView=entries[0].isIntersecting;syncCabinetPlayback();},{threshold:.35}).observe(cabinetVideo);
motionPreference.addEventListener('change',syncCabinetPlayback);

// One-time entrances mirror the reference without hiding content for reduced motion.
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}},{threshold:.12});
$$('.section-head h2,.calculator-intro h2,.cabinet h2,.method-intro h2,.deal-intro h2').forEach(heading=>{
  const words=heading.textContent.trim().split(/\s+/);heading.textContent='';
  words.forEach((word,i)=>{if(i)heading.append(' ');const span=document.createElement('span');span.textContent=word;span.style.setProperty('--word',i);heading.append(span);});
  heading.classList.add('reveal-title');revealObserver.observe(heading);
});
$$('.method-intro>p,.deal-intro>p').forEach(element=>{element.classList.add('reveal-support');revealObserver.observe(element);});
$$('.method-cards,.deal-media').forEach(element=>{element.classList.add('reveal-media');revealObserver.observe(element);});
