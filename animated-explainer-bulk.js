(function(root){
 'use strict';
 const clean=x=>String(x||'').replace(/[\s。、，,.！？!?：:；;・]/g,'');
 function cueTime(cue,text,duration,alignment){
   const t=clean(text),q=clean(cue),pos=q?t.indexOf(q):-1;
   if(pos<0)return null;
   if(Array.isArray(alignment)&&alignment.length){const total=alignment.reduce((n,a)=>n+clean(a.text).length,0),target=pos/Math.max(1,t.length)*total;let seen=0;for(const a of alignment){const length=clean(a.text).length,start=Number(a.start),end=Number(a.end);if(target<=seen+length&&Number.isFinite(start)&&Number.isFinite(end))return Math.max(0,start+(end-start)*(target-seen)/Math.max(1,length));seen+=length}}
   return pos/Math.max(1,t.length)*duration;
 }
 function makeConfig(plan,scene,duration,aspect){
   const narration=scene.narration,alignment=scene.alignment||[],gap=.85;let last=-gap;
   const nodes=plan.nodes.map((n,i)=>{const estimated=i===0?0:(cueTime(n.cue,narration,duration,alignment)??n.ratio*duration),latest=duration-.75-(2-i)*gap,at=Math.max(last+gap,Math.min(latest,estimated));last=at;return{label:n.label,icon:n.icon,entity:n.entity,kind:n.kind,image:n.image,personId:n.personId,at:Math.max(0,at)}});
   return{title:plan.title,duration,aspect,entrance:'mixed',color:'#a82e40',nodes,links:plan.links,bypass:plan.bypass,bypassLabel:plan.bypassLabel,cross:plan.cross,aiWholeStory:true};
 }
 root.AnimatedExplainerBulkLogic={cueTime,makeConfig};
 if(!root.document)return;
 const document=root.document;
 if(root.__animatedExplainerBulk)return;root.__animatedExplainerBulk=true;
 let running=false,cancelled=false,controller=null;
 function sceneData(s,i){const row=document.querySelectorAll('.scene,.slide')[i];return{title:s.title||'',narration:s.nodeType===1?row?.querySelector('.nar')?.value||'':s.narration||'',audio:s.audio||'',alignment:s.nodeType===1?row?.querySelector('audio')?._alignment||[]:s.audioAlignment||[],stale:s.audioStale||row?.dataset.audioOutdated==='1',item:s};}
 async function movie(cfg,status){
   const assets=await Promise.all(cfg.nodes.map(n=>n.image?root.AnimatedExplainerBridge.loadImage(n.image):null));
   const c=document.createElement('canvas');c.width=cfg.aspect==='9:16'?720:1280;c.height=cfg.aspect==='9:16'?1280:720;const ctx=c.getContext('2d');let stream=null,rec=null,finishTimer;
   try{
     if(!c.captureStream||typeof MediaRecorder==='undefined')throw Error('このブラウザは動画作成に対応していません。');
     const mime=['video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('対応する動画形式がありません。');
     AnimatedExplainer.render(ctx,cfg,0,assets);stream=c.captureStream(30);rec=new MediaRecorder(stream,{mimeType:mime});const chunks=[];
     const ended=new Promise((r,j)=>{rec.onstop=()=>r(new Blob(chunks,{type:rec.mimeType||mime}));rec.onerror=()=>j(Error('アニメーションの記録に失敗しました。'))});ended.catch(()=>{});
     rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.start(500);const start=performance.now();
     while((performance.now()-start)/1000<cfg.duration){if(cancelled)throw Error('一括作成を中止しました。');if(document.hidden)throw Error('画面が非表示になったため中止しました。画面を開いたまま再実行してください。');if(rec.state!=='recording')throw Error('動画の記録が停止しました。');const t=(performance.now()-start)/1000;AnimatedExplainer.render(ctx,cfg,t,assets);status(Math.min(100,Math.round(t/cfg.duration*100)));await new Promise(r=>setTimeout(r,33))}
     AnimatedExplainer.render(ctx,cfg,cfg.duration,assets);const poster=c.toDataURL('image/png');rec.stop();const blob=await Promise.race([ended,new Promise((_,j)=>{finishTimer=setTimeout(()=>j(Error('動画の仕上げが完了しませんでした。')),15000)})]);if(!blob.size)throw Error('動画が空です。');return{src:URL.createObjectURL(blob),poster};
   }finally{clearTimeout(finishTimer);if(rec&&rec.state!=='inactive')rec.stop();stream?.getTracks().forEach(t=>t.stop())}
 }
 async function build(panel){
   if(running)return;const bridge=root.AnimatedExplainerBridge;if(!bridge)return;const source=bridge.items().slice(),scenes=source.map(sceneData),status=panel.querySelector('[role=status]'),button=panel.querySelector('.ae-bulk-start'),stop=panel.querySelector('.ae-bulk-cancel'),clips=[];
   const say=text=>status.textContent=text;
   try{
     if(!scenes.length||scenes.some(s=>!s.narration.trim()))throw Error('先に全ページのナレーションを用意してください。');
     const missing=scenes.flatMap((s,i)=>!s.audio||s.stale?[i+1]:[]);if(missing.length)throw Error(missing.join('・')+'ページの音声を先に作成・更新してください。音声に合わせてアニメーションを作ります。');
     if(document.querySelector('.scene[data-image-generating="1"],.scene[data-audio-generating="1"]'))throw Error('画像・音声の生成が終わってから実行してください。');
     running=true;cancelled=false;button.disabled=true;stop.hidden=false;controller=new AbortController();say('全体のナレーションをAIが読み、人物・関係・結論をつなぐアニメ構成を作成中…');
     const snapshot=JSON.stringify(scenes.map(s=>({title:s.title,narration:s.narration,audio:s.audio})));
     let session;try{session=JSON.parse(localStorage.getItem('sb-vnnvuxccazkdzwqjmntz-auth-token')||'null')}catch{}
     const headers={'Content-Type':'application/json'};if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
     const timer=setTimeout(()=>controller.abort(),150000);let r;try{r=await fetch('https://vnnvuxccazkdzwqjmntz.supabase.co/functions/v1/video-background-jobs',{method:'POST',headers,body:JSON.stringify({action:'animationPlan',scenes:scenes.map(s=>({title:s.title,narration:s.narration}))}),signal:controller.signal})}finally{clearTimeout(timer)}
     const plan=await r.json();if(!r.ok)throw Error(plan.error||'AIのアニメ構成を取得できませんでした。');if(!Array.isArray(plan.scenes)||plan.scenes.length!==scenes.length)throw Error('AIの構成とページ数が一致しません');
     root.ExplainerCharacters?.assignPlan(plan);
     panel.querySelector('.ae-bulk-intent').textContent='全体の意図：'+(plan.intent||'');
     const durations=[];for(const s of scenes){if(cancelled)throw Error('一括作成を中止しました。');const d=await bridge.seconds(s.audio);if(d<3||d>180)throw Error('各ページの音声は3～180秒にしてください。長いページは分割してから作成できます。');durations.push(d)}
     const aspect=typeof root.aspect==='function'?root.aspect():document.getElementById('videoFormat')?.value||'16:9',total=durations.reduce((a,b)=>a+b,0);let completed=0;
     for(let i=0;i<scenes.length;i++){if(cancelled)throw Error('一括作成を中止しました。');const cfg=makeConfig(plan.scenes[i],scenes[i],durations[i],aspect);const clip=await movie(cfg,p=>say(`全体アニメ作成中… ${i+1}/${scenes.length}ページ・このページ ${p}%（全体 ${Math.round((completed+durations[i]*p/100)/total*100)}%）。画面を開いたままお待ちください。`));clips.push({...clip,cfg});completed+=durations[i];}
     const current=bridge.items(),now=current.map(sceneData);if(current.length!==source.length||current.some((s,i)=>s!==source[i])||JSON.stringify(now.map(s=>({title:s.title,narration:s.narration,audio:s.audio})))!==snapshot)throw Error('作成中にナレーションや音声が変更されています。変更後の内容でもう一度実行してください。');
     for(let i=0;i<clips.length;i++)bridge.insert(i,clips[i].cfg,clips[i].src,clips[i].poster);bridge.refresh();clips.length=0;
     say('全体の意図に沿ったアニメーションが完成しました。ナレーションとつないで動画を書き出します。');
     const subtitlePosition=document.getElementById('subtitlePosition');if(subtitlePosition&&[...subtitlePosition.options].some(o=>o.value==='bottom')){subtitlePosition.value='bottom';subtitlePosition.dispatchEvent(new Event('change',{bubbles:true}))}
     const exportButton=document.getElementById('makeVideo')||document.getElementById('exportVideo');if(exportButton&&!exportButton.disabled)exportButton.click();else say('全体のアニメーションが完成しました。音声の準備を確認して「動画を書き出す」を押してください。');
   }catch(e){say(cancelled?'一括作成を中止しました。元のシーンは保持しています。':(e.name==='AbortError'?'AIの構成を待つ時間を超えました。もう一度実行してください。':e.message));for(const clip of clips)URL.revokeObjectURL(clip.src)}finally{running=false;controller=null;button.disabled=false;stop.hidden=true;}
 }
 function install(){if(document.getElementById('aeWholeStoryPanel')||!root.AnimatedExplainerBridge)return;const panel=document.createElement('div');panel.id='aeWholeStoryPanel';panel.style.cssText='margin:12px;padding:14px;background:#fff0f5;border:1px solid #e9aac2;border-radius:15px;font:14px system-ui;color:#5c2943';panel.innerHTML='<button type="button" class="ae-bulk-start" style="width:100%;padding:16px;min-height:54px;border:0;border-radius:12px;background:#ed91b7;color:#351224;font:800 17px system-ui">🌸 全体をAIアニメーション化</button><p style="margin:9px 0">全ページの意図をAIがまとめて読み取り、ナレーションに沿って文字・人物・矢印を一括作成し、完成動画の書き出しまで進めます。人物には収録済みのOpen Peeps素材を使い、同じ人物を全ページで統一します。先に全ページの音声を用意してください。</p><p class="ae-bulk-intent" style="margin:8px 0"></p><p role="status" style="margin:8px 0"></p><button type="button" class="ae-bulk-cancel" hidden style="padding:10px 16px;min-height:44px">一括作成を中止</button>';
     const bar=document.getElementById('videoDraftBar');if(bar)bar.after(panel);else document.body.prepend(panel);panel.querySelector('.ae-bulk-start').onclick=()=>build(panel);panel.querySelector('.ae-bulk-cancel').onclick=()=>{cancelled=true;controller?.abort()};
 }
 let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;install()})}}).observe(document.body,{childList:true,subtree:true});install();
})(typeof window==='undefined'?globalThis:window);
