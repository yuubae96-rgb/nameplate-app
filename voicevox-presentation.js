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
 const p=document.createElement('div');p.className='field';
 const geminiOptions=[...voice.options].map(o=>'<option value="gemini:'+o.value+'">Gemini：'+o.textContent+'</option>').join('');
 p.innerHTML='<label>ナレーション音声</label><select id="voiceProvider"><option value="voicevox">VOICEVOX：青山龍星</option>'+geminiOptions+'<option value="fish" selected>Fish Audio：日本語ナレーション（無料枠）</option></select><div class="hint">初期設定はFish Audioです。この1か所でVOICEVOXやGeminiの声へ切り替えられます。</div>';
 field.parentNode.insertBefore(p,field);provider=document.getElementById('voiceProvider')
}
const FISH_VOICE_KEY='fishVoiceChoiceV1',FISH_DEFAULT='297a6fd278df47c3b9da9bfdf55ac89a';
const fishPanel=document.createElement('div');fishPanel.className='field';fishPanel.id='fishVoicePanel';fishPanel.style.display='none';fishPanel.innerHTML='<label>Fish Audioの声</label><select id="fishVoice"><option value="'+FISH_DEFAULT+'">さとる（ナレーション・標準）</option></select><input id="fishVoiceQuery" type="search" placeholder="声を名前で検索" style="margin-top:7px"><div class="actions" style="margin-top:7px"><button class="btn" id="fishVoiceSearch" type="button">声を検索</button><button class="btn" id="fishVoiceMore" type="button" style="display:none">さらに表示</button></div><div class="hint" id="fishVoiceStatus" aria-live="polite"></div>';
provider.closest('.field').insertAdjacentElement('afterend',fishPanel);
const fishVoice=document.getElementById('fishVoice'),fishQuery=document.getElementById('fishVoiceQuery'),fishStatus=document.getElementById('fishVoiceStatus'),fishMore=document.getElementById('fishVoiceMore');
let fishPage=1,fishSearch='',fishRequest=0,fishLoaded=false;
try{if(localStorage.getItem('fishVoiceDefaultSatoruV2')!=='1'){localStorage.setItem(FISH_VOICE_KEY,FISH_DEFAULT);localStorage.setItem('fishVoiceDefaultSatoruV2','1')}const saved=localStorage.getItem(FISH_VOICE_KEY)||'';if(saved&&saved!==FISH_DEFAULT&&/^[a-f0-9]{32}$/i.test(saved)){fishVoice.add(new Option('前回選んだ声（一覧を読み込み中）',saved));fishVoice.value=saved}}catch(_){}
async function loadFishVoices(reset){if(provider.value!=='fish')return;if(reset){fishPage=1;fishSearch=fishQuery.value.trim();const selected=fishVoice.value;fishVoice.innerHTML='';fishVoice.add(new Option('さとる（ナレーション・標準）',FISH_DEFAULT));if(selected&&selected!==FISH_DEFAULT)fishVoice.add(new Option('選択中の声',selected));if(selected)fishVoice.value=selected}const id=++fishRequest;fishStatus.textContent='日本語の声を読み込み中…';fishMore.style.display='none';try{const r=await fetch('https://vnnvuxccazkdzwqjmntz.supabase.co/functions/v1/youtube-video-maker-safe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'listFishVoices',page:fishPage,query:fishSearch})});const d=await r.json();if(!r.ok)throw Error(d.error||'HTTP '+r.status);if(id!==fishRequest||provider.value!=='fish')return;for(const item of d.items||[]){let o=[...fishVoice.options].find(x=>x.value===item.id),name=item.title+(item.licensed?'［公認］':'')+(item.author?'（'+item.author+'）':'');if(o)o.textContent=name;else fishVoice.add(new Option(name,item.id))}fishStatus.textContent='日本語の声を'+Math.max(0,fishVoice.options.length-1)+'種類表示中。選んで試聴できます。';fishMore.style.display=d.hasMore?'':'none';fishLoaded=true}catch(e){if(id===fishRequest)fishStatus.textContent='声一覧を読み込めませんでした：'+e.message}}
fishVoice.onchange=()=>{try{localStorage.setItem(FISH_VOICE_KEY,fishVoice.value)}catch(_){}try{if(typeof pages!=='undefined')pages.forEach(p=>{if(p.audioSource?.startsWith('Fish Audio'))p.audioStale=true})}catch(_){}};
document.getElementById('fishVoiceSearch').onclick=()=>loadFishVoices(true);fishQuery.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();loadFishVoices(true)}};fishMore.onclick=()=>{fishPage++;loadFishVoices(false)};
const dir=document.getElementById('direction')?.closest('.field');
function syncProvider(){const isV=provider.value==='voicevox';fishPanel.style.display=provider.value==='fish'?'':'none';if(provider.value==='fish'&&!fishLoaded)loadFishVoices(true);if(provider.value==='fish')voice.value='Fish Audio';window.__geminiTtsModel='gemini-3.8-flash-tts';field.style.display='none';if(dir)dir.style.display=isV?'none':'';if(isV){if(![...voice.options].some(o=>o.value==='VOICEVOX:青山龍星'))voice.add(new Option('VOICEVOX：青山龍星','VOICEVOX:青山龍星'));voice.value='VOICEVOX:青山龍星'}else{const v=provider.value.replace(/^gemini:/,'');if([...voice.options].some(o=>o.value===v))voice.value=v}}
try{if(localStorage.getItem('presentationVoiceDefaultFishV1')!=='1'){localStorage.setItem('presentationVoiceProvider','fish');localStorage.setItem('presentationVoiceDefaultFishV1','1')}provider.value=localStorage.getItem('presentationVoiceProvider')||'fish';if(provider.value!=='voicevox'&&provider.value!=='fish'&&!provider.value.startsWith('gemini:'))provider.value='fish'}catch(_){provider.value='fish'}
provider.onchange=()=>{try{localStorage.setItem('presentationVoiceProvider',provider.value)}catch(_){}syncProvider()};syncProvider();
const geminiTts=window.tts;
async function fishTts(text){const r=await fetch('https://vnnvuxccazkdzwqjmntz.supabase.co/functions/v1/youtube-video-maker-safe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'generateTts',ttsProvider:'fish',fishTimestamps:true,text,fishVoiceId:fishVoice.value||FISH_DEFAULT})});const d=await r.json();if(!r.ok)throw Error(d.error||'Fish Audio HTTP '+r.status);return d}
if([...voice.options].every(o=>o.value!=='Fish Audio'))voice.add(new Option('Fish Audio：日本語ナレーション','Fish Audio'));
window.tts=async function(text){return provider.value==='voicevox'?vv(text):provider.value==='fish'?fishTts(text):geminiTts(text)};
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
  allBtn.disabled=true;allBtn.dataset.audioRunning='1';allBtn.textContent='VOICEVOX音声を作成中…';
  let completed=0;
  try{
   for(let i=0;i<pages.length;i++){
    const p=pages[i];
    let reading=String(p.reading||p.narration||'').trim();
    while(!reading&&document.documentElement.dataset.narrationGenerating==='1'){
     if(st)st.textContent='次のナレーションを待っています… 原稿 '+i+'/'+pages.length+'・音声 '+completed+'/'+pages.length;
     allBtn.textContent='追いかけ作成中 '+completed+'/'+pages.length;
     await new Promise(r=>setTimeout(r,350));
     const n=document.getElementById('nar-'+i),rd=document.getElementById('read-'+i);
     if(n)pages[i].narration=n.value;if(rd)pages[i].reading=rd.value;
     reading=String(pages[i].reading||pages[i].narration||'').trim();
    }
    if(!reading)throw Error('PAGE '+(i+1)+'のナレーションがまだありません。先にナレーション作成を開始してください。');
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
  }finally{const b=document.getElementById('allAudio');if(b){b.dataset.audioRunning='0';b.disabled=false;b.textContent='全ページのAI音声を作る'}}
 },true)
}
})();`;
d.body.appendChild(s);return true}
let n=0;const t=setInterval(()=>{n++;if(inject()||n>120)clearInterval(t)},250);window.addEventListener('load',()=>setTimeout(inject,350));
})();
