(()=>{
function targetDoc(){try{return document.getElementById('main')?.contentDocument||document.getElementById('app')?.contentDocument||null}catch(_){return null}}
function inject(){const d=targetDoc();if(!d||d.documentElement.dataset.voicevoxAoyamaFix==='1')return false;const voice=d.getElementById('voice'),all=d.getElementById('allAudio');if(!voice||!all)return false;d.documentElement.dataset.voicevoxAoyamaFix='1';
const s=d.createElement('script');s.textContent=`(()=>{
const API='https://api.tts.quest/v3/voicevox/synthesis',SPEAKER=13,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function b64(blob){return await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(String(f.result).split(',')[1]||'');f.onerror=rej;f.readAsDataURL(blob)})}
async function vv(text){
 const q=String(text||'').trim();if(!q)throw Error('読み上げる文章がありません。');
 let last='VOICEVOX音声を作成できませんでした。';
 for(let a=0;a<5;a++){
  try{
   const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({text:q,speaker:String(SPEAKER)})});
   if(!r.ok)throw Error('VOICEVOX API HTTP '+r.status);
   const j=await r.json();if(!j.success){last=j.message||j.error||last;await sleep(Math.max(1,Number(j.retryAfter||2))*1000);continue}
   for(let i=0;i<120;i++){
    const st=await fetch(j.audioStatusUrl,{cache:'no-store'}).then(x=>x.json()).catch(()=>null);
    if(st?.isAudioError)throw Error('VOICEVOX側で音声生成エラーになりました。');
    if(st?.isAudioReady){
     const u=j.mp3DownloadUrl||j.wavDownloadUrl;if(!u)throw Error('VOICEVOX音声URLを取得できませんでした。');
     const ar=await fetch(u,{cache:'no-store'});if(!ar.ok)throw Error('VOICEVOX音声の取得に失敗しました。');
     const blob=await ar.blob();return{mimeType:blob.type||'audio/mpeg',data:await b64(blob),leadingSilenceMs:0}
    }
    await sleep(1000)
   }
   last='VOICEVOX音声生成が120秒以内に終わりませんでした。'
  }catch(e){last=e?.message||String(e);if(a<4)await sleep(1800)}
 }
 throw Error(last)
}
const voice=document.getElementById('voice'),field=voice?.closest('.field');if(!voice||!field)return;
let provider=document.getElementById('voiceProvider');
if(!provider){
 const p=document.createElement('div');p.className='field';p.innerHTML='<label>音声エンジン</label><select id="voiceProvider"><option value="voicevox" selected>VOICEVOX：青山龍星（デフォルト）</option><option value="gemini">Google Gemini TTS・12種類</option></select><div class="hint">通常は青山龍星。必要な時だけGemini 12種類へ切り替えます。</div>';
 field.parentNode.insertBefore(p,field);provider=document.getElementById('voiceProvider')
}
const old=voice.value,dir=document.getElementById('direction')?.closest('.field');
function syncProvider(){const isV=provider.value==='voicevox';field.style.display=isV?'none':'';if(dir)dir.style.display=isV?'none':'';if(isV){if(![...voice.options].some(o=>o.value==='VOICEVOX:青山龍星'))voice.add(new Option('VOICEVOX：青山龍星','VOICEVOX:青山龍星'));voice.value='VOICEVOX:青山龍星'}else voice.value=old||voice.options[0]?.value||''}
provider.onchange=syncProvider;syncProvider();
const geminiTts=window.tts;
window.tts=async function(text){return provider.value==='voicevox'?vv(text):geminiTts(text)};
try{tts=window.tts}catch(_){}
const sample=document.getElementById('sampleVoice');if(sample&&!sample.dataset.vvfix){sample.dataset.vvfix='1';sample.addEventListener('click',async e=>{if(provider.value!=='voicevox')return;e.stopImmediatePropagation();sample.disabled=true;const st=document.getElementById('audioStatus'),a=document.getElementById('sampleAudio');if(st)st.textContent='青山龍星の試聴音声を作成中…';try{const x=await vv('こんにちは。プレゼン資料の内容を、分かりやすく自然にご紹介します。');a.src='data:'+(x.mimeType||'audio/mpeg')+';base64,'+x.data;a.style.display='block';if(st)st.textContent='VOICEVOX 青山龍星です。下の再生ボタンで確認できます。'}catch(err){if(st)st.textContent='青山龍星の試聴エラー：'+err.message}finally{sample.disabled=false}},true)}
const allBtn=document.getElementById('allAudio');
if(allBtn&&!allBtn.dataset.vvAllFix){
 allBtn.dataset.vvAllFix='1';
 allBtn.addEventListener('click',async e=>{
  if(provider.value!=='voicevox')return;
  e.preventDefault();e.stopImmediatePropagation();
  const st=document.getElementById('audioStatus');
  if(typeof pages==='undefined'||!pages.length){if(st)st.textContent='先にPDFを読み込んでください。';return}
  for(let i=0;i<pages.length;i++){const n=document.getElementById('nar-'+i),rd=document.getElementById('read-'+i);if(n)pages[i].narration=n.value;if(rd)pages[i].reading=rd.value}
  if(!pages.every(x=>String(x.narration||'').trim())){if(st)st.textContent='先に「ChatGPTで全ページのナレーションを作る」を押してください。';return}
  allBtn.disabled=true;allBtn.textContent='VOICEVOX音声を作成中…';
  let completed=0;
  try{
   for(let i=0;i<pages.length;i++){
    const p=pages[i],reading=String(p.reading||p.narration||'').trim();
    if(p.audio&&!p.audioStale&&p.audioText===reading){completed++;if(st)st.textContent='作成済みを確認中… '+completed+'/'+pages.length+'ページ';continue}
    if(st)st.textContent='VOICEVOX 青山龍星で作成中… '+(i+1)+'/'+pages.length+'ページ';
    allBtn.textContent='作成中 '+(i+1)+'/'+pages.length;
    await new Promise(r=>setTimeout(r,30));
    const x=await vv(reading);
    p.audio='data:'+(x.mimeType||'audio/mpeg')+';base64,'+x.data;
    p.audioSource='VOICEVOX・青山龍星';p.audioText=reading;p.audioStale=false;p.leadingSilenceMs=Number(x.leadingSilenceMs||0);completed++;
    const audio=document.getElementById('audio-'+i);if(audio){audio.src=p.audio;audio.style.display='block'}
    const status=document.getElementById('status-'+i);if(status)status.textContent='VOICEVOX 青山龍星の音声が完成しました。';
    if(st)st.textContent='完成 '+completed+'/'+pages.length+'ページ';
    await new Promise(r=>setTimeout(r,180));
   }
   if(typeof render==='function')render();
   if(st)st.textContent='全'+completed+'ページのVOICEVOX音声が完成しました。';
  }catch(err){
   if(st)st.textContent='PAGE '+(completed+1)+'で停止しました：'+(err?.message||String(err))+'　もう一度押すと続きから再開します。';
  }finally{const b=document.getElementById('allAudio');if(b){b.disabled=false;b.textContent='全ページのAI音声を作る'}}
 },true)
}
})();`;
d.body.appendChild(s);return true}
let n=0;const t=setInterval(()=>{n++;if(inject()||n>120)clearInterval(t)},250);window.addEventListener('load',()=>setTimeout(inject,350));
})();