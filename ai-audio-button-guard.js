(()=>{
function targetDoc(){try{return document.getElementById('app')?.contentDocument||null}catch(_){return null}}
function install(){
  const d=targetDoc();
  if(!d||d.documentElement.dataset.audioButtonGuard==='1') return false;
  const btn=d.getElementById('allAudio');
  const nar=d.getElementById('narStatus');
  const audio=d.getElementById('audioStatus');
  if(!btn||!nar||!audio) return false;
  d.documentElement.dataset.audioButtonGuard='1';

  let queued=false;
  let autoStarting=false;
  const total=()=>d.querySelectorAll('#slides .slide').length||d.querySelectorAll('.slide').length||0;
  const progress=()=>{
    const t=String(nar.textContent||'');
    let m=t.match(/(\d+)\s*\/\s*(\d+)\s*ページ/);
    if(!m) m=t.match(/PAGE\s*(\d+)\s*\/\s*(\d+)/i);
    return m?{done:Number(m[1])||0,total:Number(m[2])||total()}:null;
  };
  const narrationRunning=()=>{
    const t=String(nar.textContent||'');
    const p=progress();
    if(p&&p.total>0&&p.done<p.total&&/(読んでいます|作成中|ナレーション)/.test(t)) return true;
    return /(ChatGPTが資料を読んでいます|ナレーションを作成中|PAGE\s*\d+.*作成中)/i.test(t);
  };
  const narrationComplete=()=>{
    const t=String(nar.textContent||'');
    const p=progress();
    return /全\s*\d+\s*ページ.*ナレーション.*完成|ナレーション.*完成しました/.test(t) || (!!p&&p.total>0&&p.done>=p.total);
  };
  const paintWaiting=()=>{
    const p=progress(),n=total();
    const done=p?.done||0, all=p?.total||n;
    btn.disabled=false;
    btn.style.background='#b7791f';
    btn.style.opacity='1';
    btn.style.cursor='pointer';
    btn.textContent=queued
      ? `⏳ ナレーション完了待ち… ${done}/${all||'?'}（完了後に自動開始）`
      : `▶ ナレーション完了後にAI音声を作る`;
    if(queued) audio.textContent=`予約しました。ナレーション ${done}/${all||'?'} 完了後、自動でAI音声を作ります。`;
  };
  const restoreReady=()=>{
    if(queued||autoStarting) return;
    btn.style.background='#147a55';
    btn.style.opacity='1';
    btn.style.cursor='pointer';
    if(!/作成中|完成|停止/.test(btn.textContent||'')) btn.textContent='全ページのAI音声を作る';
  };

  btn.addEventListener('click',e=>{
    if(autoStarting){autoStarting=false;return;}
    if(narrationRunning()&&!narrationComplete()){
      e.preventDefault();
      e.stopImmediatePropagation();
      queued=true;
      paintWaiting();
    }
  },true);

  const tick=()=>{
    if(queued){
      if(narrationComplete()){
        queued=false;
        audio.textContent='✅ ナレーションが完成しました。AI音声を自動で作り始めます…';
        btn.textContent='⏳ AI音声を開始しています…';
        btn.style.background='#b7791f';
        autoStarting=true;
        setTimeout(()=>btn.click(),120);
      }else paintWaiting();
    }else if(narrationRunning()&&!narrationComplete()){
      paintWaiting();
    }else restoreReady();
  };
  setInterval(tick,250);
  tick();
  return true;
}
let tries=0;
const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},250);
window.addEventListener('load',()=>setTimeout(install,400));
})();
