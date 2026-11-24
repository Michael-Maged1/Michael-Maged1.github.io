/* Photoreal film slots are filled only with actual generated/authorized videos. */
const POLICE_FILMS={};
async function loadPoliceFilms(){try{
 const response=await fetch('assets/media/police-films.json',{cache:'no-store'});if(!response.ok)return;
 const films=await response.json(),checks=new Map();
 for(const slots of Object.values(films))for(const [key,film]of Object.entries(slots))if(film.optional){
  if(!checks.has(film.src))checks.set(film.src,fetch(film.src,{method:'HEAD',cache:'no-store'}).then(r=>r.ok).catch(()=>false));
  if(!await checks.get(film.src))delete slots[key];
 }
 Object.assign(POLICE_FILMS,films);
}catch{} }

function policeFilmFor(vehicle,type,station){const key=type==='arrest'?'arrest':station===POLICE.stations[0]?'handoffFirst':'handoffSecond',film=POLICE_FILMS[vehicle]?.[key];return film&&typeof film.src==='string'&&film.src.startsWith('assets/media/')?film:null;}
