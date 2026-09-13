(()=>{
const API='https://api.tts.quest/v3/voicevox/synthesis';
const DEFAULT_SPEAKER=13;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function blobToBase64(blob){return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(',')[1]||'');fr.onerror=reject;fr.readAsDataURL(blob)})}
async function voicevoxTts(text,speaker=DEFAULT_SPEAKER){
  let lastErr='VOICEVOX音声を作成できませんでした。';
  for(let attempt=0;attempt<4;attempt++){
    const body=new URLSearchParams({text:String(text||''),speaker:String(speaker)});
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
    const d=await r.json();
    if(!d.success){lastErr=d.message||d.error||lastErr;const wait=Math.max(1,Number(d.retryAfter||2));await sleep(wait*1000);continue}
    for(let i=0;i<90;i++){
      const st=await fetch(d.audioStatusUrl,{cache:'no-store'}).then(x=>x.json()).catch(()=>null);
      if(st?.isAudioError)throw new Error('VOICEVOX音声生成でエラーになりました。');
      if(st?.isAudioReady){const url=d.mp3DownloadUrl||d.wavDownloadUrl;const a=await fetch(url,{cache:'no-store'});if(!a.ok)throw new Error('VOICEVOX音声の取得に失敗しました。');const blob=await a.blob();return{mimeType:blob.type||'audio/mpeg',data:await blobToBase64(blob),leadingSilenceMs:0}}
      await sleep(1000);
    }
    throw new Error('VOICEVOX音声生成が90秒以内に終わりませんでした。');
  }
  throw new Error(lastErr);
}
function install(){
  const voice=document.getElementById('voice');
  if(!voice||document.getElementById('voiceProvider'))return false;
  const field=voice.closest('.field'); if(!field)return false;
  const provider=document.createElement('div');provider.className='field';provider.innerHTML='<label>音声エンジン</label><select id="voiceProvider"><option value="voicevox" selected>VOICEVOX：青山龍星（デフォルト）</option><option value="gemini">Google Gemini TTS・12種類</option></select><div class="hint">VOICEVOXは青山龍星を標準で使います。必要なときだけGemini 12種類へ切り替えられます。</div>';
  field.parentNode.insertBefore(provider,field);
  const originalVoiceValue=voice.value;
  const vvOpt=new Option('VOICEVOX：青山龍星','VOICEVOX:青山龍星');voice.add(vvOpt);
  const dir=document.getElementById('direction')?.closest('.field');
  const sync=()=>{const vv=document.getElementById('voiceProvider').value==='voicevox';field.style.display=vv?'none':'';if(dir)dir.style.display=vv?'none':'';if(vv)voice.value='VOICEVOX:青山龍星';else if(voice.value==='VOICEVOX:青山龍星')voice.value=originalVoiceValue||voice.options[0]?.value||'';};
  document.getElementById('voiceProvider').onchange=sync;sync();
  const original=window.tts;
  if(typeof original==='function'){
    const replacement=async text=>document.getElementById('voiceProvider')?.value==='voicevox'?voicevoxTts(text,DEFAULT_SPEAKER):original(text);
    try{window.tts=replacement;tts=replacement}catch(_){window.tts=replacement}
  }
  const tag=document.querySelector('.ai-stack .ai-row:nth-child(4) strong');if(tag)tag.textContent='VOICEVOX 青山龍星（標準）／Gemini 12種類';
  return true;
}
let n=0;const t=setInterval(()=>{n++;if(install()||n>40)clearInterval(t)},250);document.addEventListener('DOMContentLoaded',install);
})();