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
})();`;
d.body.appendChild(s);return true}
let n=0;const t=setInterval(()=>{n++;if(inject()||n>120)clearInterval(t)},250);window.addEventListener('load',()=>setTimeout(inject,350));
})();