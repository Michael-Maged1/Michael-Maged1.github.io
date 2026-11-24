/* Two-stage title screen: role first, then a visual selection of ready patrol cars. */
let patrolLaunching=false;
function showRoleScreen(){
 $('roleScreen').classList.remove('hidden');$('patrolScreen').classList.add('hidden');$('menu').dataset.screen='roles';
}
function showPatrolScreen(){
 $('roleScreen').classList.add('hidden');$('patrolScreen').classList.remove('hidden');$('menu').dataset.screen='patrol';renderPatrolVehicles();$('patrolTitle').focus?.();
}
function renderPatrolVehicles(){
 const grid=$('patrolVehicleGrid');if(!grid)return;
 const cars=CARS.filter(c=>c.police&&!c.localImport&&c.available!==false),selected=selectedPoliceVehicle();
 grid.innerHTML=cars.map((c,i)=>{const active=c.id===selected.id,name=c.id==='policeSuburban'?'سوبربان شريف':c.id==='policeDuster'?'رينو داستر':'BMW 320i',tag=c.id==='policeSuburban'?'SUBURBAN SHERIFF CRUISER':c.id==='policeDuster'?'RENAULT DUSTER POLICE':'BMW 320i POLICE',image=MENU_CAR_IMAGES[c.id]||CAR_THUMBS[c.id]||CAR_THUMBS.qashqai;
 return `<button class="patrolVehicle ${active?'selected':''}" data-patrol-car="${c.id}" aria-pressed="${active}"><span class="vehicleTopline"><small>دورية / 0${i+1}</small><i>${active?'✓':'○'}</i></span><img src="${image}" alt="${c.name}"><span class="vehicleName">${name}</span><small class="vehicleModel" dir="ltr">${tag}</small><span class="vehicleSpecs"><span>${Math.round(c.topSpeed*3.6)}<small>كم/س</small></span><span>${c.id==='policeSuburban'?'دورية كبيرة':'دورية مدمجة'}<small>الفئة</small></span></span><span class="vehicleSelected">${active?'تم اختيار الدورية':'اختر هذه الدورية'} <b>${active?'✓':'←'}</b></span></button>`;}).join('');
 grid.querySelectorAll('[data-patrol-car]').forEach(btn=>btn.addEventListener('click',()=>{if(patrolLaunching)return;sfxUI();selectPoliceVehicle(btn.dataset.patrolCar);grid.querySelector(`[data-patrol-car="${btn.dataset.patrolCar}"]`)?.focus();}));
 $('patrolFleetCount').textContent=`${cars.length} سيارات جاهزة`;
 $('patrolSelectionStatus').textContent=patrolLaunching?'جارٍ تجهيز الدورية…':`${selected.id==='policeSuburban'?'سوبربان شريف':selected.id==='policeDuster'?'رينو داستر':'BMW 320i'} · جاهزة للانطلاق`;
 $('startPatrol').disabled=patrolLaunching;
}

async function runWithLaunchTransition(mode, carAsset, title, tip, icon='🚗'){
 const trans=$('launchTransition'),bar=$('launchBarFill'),pct=$('launchTransPct'),titleEl=$('launchTransTitle'),tipEl=$('launchTransTip'),iconEl=$('launchTransIcon'),statusEl=$('launchTransStatus');
 if(titleEl&&title)titleEl.textContent=title;
 if(tipEl&&tip)tipEl.textContent=tip;
 if(iconEl&&icon)iconEl.textContent=icon;
 if(statusEl)statusEl.textContent='تجهيز المحرك والمسارات…';
 if(bar)bar.style.width='20%';
 if(pct)pct.textContent='20%';
 if(trans)trans.classList.remove('hidden','fadeOut');

 const update=async(p,txt)=>{
  if(bar)bar.style.width=p+'%';
  if(pct)pct.textContent=p+'%';
  if(statusEl&&txt)statusEl.textContent=txt;
  if(typeof requestAnimationFrame==='function')await new Promise(r=>requestAnimationFrame(r));
  else await new Promise(r=>setTimeout(r,16));
 };

 try{
  await update(40,'تحميل مجسم السيارة وإعداد نظام القيادة…');
  if(carAsset){
   try{await ensureVehicleModel(carAsset);}catch(err){console.warn('Vehicle model fallback:',err);}
  }
  await update(75,'تهيئة رسوميات شوارع أسيوط…');
  if(typeof requestAnimationFrame==='function')await new Promise(r=>requestAnimationFrame(r));
  else await new Promise(r=>setTimeout(r,16));
  await update(100,'انطلاق الوردية!');
  await new Promise(r=>setTimeout(r,140));

  startRun(mode);
  initAudio();

  if(trans){
   trans.classList.add('fadeOut');
   setTimeout(()=>{trans.classList.add('hidden');trans.classList.remove('fadeOut');},480);
  }
  return true;
 }catch(e){
  console.error('Launch error:',e);
  startRun(mode);
  initAudio();
  if(trans)trans.classList.add('hidden');
  return false;
 }
}

async function launchSelectedPatrol(){
 if(patrolLaunching)return false;patrolLaunching=true;renderPatrolVehicles();sfxUI();
 const selected=selectedPoliceVehicle();
 const carName=selected.id==='policeSuburban'?'سوبربان شريف':selected.id==='policeDuster'?'رينو داستر':'BMW 320i';
 try{
  await runWithLaunchTransition('police',selected.asset,`جارٍ تجهيز ${carName} وانطلاق الدورية…`,'تجهيز دورية الشرطة وشوارع أسيوط للتعامل مع البلاغات وتأمين المدينة','🚓');
  return true;
 }catch(e){
  $('patrolSelectionStatus').textContent='تعذّر تجهيز الدورية. حاول مرة أخرى.';
  return false;
 }finally{
  patrolLaunching=false;
  if($('startPatrol'))$('startPatrol').disabled=false;
 }
}
$('patrolBack').addEventListener('click',()=>{if(!patrolLaunching){sfxUI();showRoleScreen();}});
$('startPatrol').addEventListener('click',launchSelectedPatrol);
addEventListener('keydown',e=>{if(e.key==='Escape'&&G.state==='menu'&&$('menu').dataset.screen==='patrol'&&!patrolLaunching){showRoleScreen();document.querySelector('[data-mode="police"]')?.focus();}});
