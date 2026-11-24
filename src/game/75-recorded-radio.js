/* Invisible role-specific MP3 playlists. Local server scans folders on every refresh. */
const RADIO={audio:null,signature:'',blocked:false,mode:'',tracks:{police:[],uber:[]},bag:[],last:'',failed:new Set(),loading:false,refreshAt:0};
function shuffledTracks(tracks,last){const bag=[...tracks];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag[bag.length-1]===last)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];return bag;}
async function refreshMusicFolders(){
 if(RADIO.loading)return;RADIO.loading=true;RADIO.refreshAt=Date.now()+60000;
 try{
  const r=await fetch('assets/music/playlist.json',{cache:'no-store'});
  if(r.ok){
   const data=await r.json();
   for(const role of ['police','uber']){
    const list=(data[role]||[]).filter(s=>typeof s==='string'&&s.startsWith('assets/music/'+role+'/')&&/\.mp3$/i.test(s));
    if(list.length)RADIO.tracks[role]=list;
   }
  }
 }catch{}finally{RADIO.loading=false;syncRecordedRadio();}
}
function nextRoleSong(){
 const available=(RADIO.tracks[RADIO.mode]||[]).filter(s=>!RADIO.failed.has(s));
 if(!available.length){RADIO.audio?.pause();return;}
 if(!RADIO.bag.length)RADIO.bag=shuffledTracks(available,RADIO.last);
 const src=RADIO.bag.pop();if(!available.includes(src)){nextRoleSong();return;}
 RADIO.last=src;RADIO.audio.src=src;RADIO.blocked=false;
 if(G.music&&G.sound&&G.state==='play')RADIO.audio.play().catch(()=>{RADIO.blocked=true;});
}
function syncRecordedRadio(){
 syncCityAmbience();
 const role=G.mode==='police'?'police':'uber',on=G.music&&G.sound&&G.state==='play';
 if(Date.now()>RADIO.refreshAt&&!RADIO.loading&&typeof fetch==='function')void refreshMusicFolders();
 if(RADIO.mode!==role){RADIO.mode=role;RADIO.bag=[];RADIO.last='';RADIO.failed.clear();if(RADIO.audio){RADIO.audio.pause();RADIO.audio.removeAttribute('src');}}
 if(typeof window.Audio!=='function')return;
 if(!RADIO.audio){RADIO.audio=new Audio();RADIO.audio.controls=false;RADIO.audio.preload='none';RADIO.audio.onended=nextRoleSong;RADIO.audio.onerror=()=>{RADIO.failed.add(RADIO.last);nextRoleSong();};}
 const tracks=RADIO.tracks[role]||[];
 if(!tracks.length){RADIO.audio.pause();return;}
 if(MUSIC.timer){clearInterval(MUSIC.timer);MUSIC.timer=null;}if(MUSIC.gain&&AC)MUSIC.gain.gain.setTargetAtTime(0,AC.currentTime,.15);
 const sirenActive=role==='police'&&typeof POLICE!=='undefined'&&POLICE.siren;
 RADIO.audio.volume=sirenActive?.1:.32;
 if(on){if(!RADIO.last)nextRoleSong();else if(RADIO.audio.paused&&!RADIO.blocked&&!RADIO.failed.has(RADIO.last))RADIO.audio.play().catch(()=>{RADIO.blocked=true;});}else RADIO.audio.pause();
}
