(()=>{
if(window.__ytRegenFix20261007)return; window.__ytRegenFix20261007=true;
const $=id=>document.getElementById(id);
function strictPrompt(raw){
  return ['【画像内文字の最優先ルール】','画像内に文字を描く必要がある場合は、必ず自然な日本語だけにする。英語・ローマ字・英単語・英文・英語ラベル・英語キャプションは一切入れない。','日本語として正しく書けない文字は無理に描かず、その文字要素自体を省略する。','タイトル帯や動画字幕は画像そのものには描かない。','',String(raw||'')].join('\n');
}
function refreshNow(){try{window.__updateVideoBuildProgress?.()}catch(_){}}
function installProgressHook(){
  if(window.__regenProgressHook)return; window.__regenProgressHook=true;
  const oldSet=window.setInterval;
}
const original=window.genImage;
if(typeof original==='function'){
  window.genImage=async function(i){
    if(!project?.scenes?.[i])return false;
    if(project.scenes[i]._imageGenerating)return false;
    sync(i);
    const s=project.scenes[i], oldImage=s.image, oldVideo=s.video, oldProvider=s.imageProvider;
    const ta=$('imgp-'+i), oldPrompt=ta?.value ?? s.imagePrompt ?? '';
    s._imageGenerating=true;
    s.image=''; s.video='';
    if(ta) ta.value=strictPrompt(oldPrompt); else s.imagePrompt=strictPrompt(oldPrompt);
    const box=$('imgbox-'+i); if(box) box.innerHTML='<div style="padding:18px;text-align:center">AI画像を作り直しています…</div>';
    const btn=$('imageBtn-'+i)||document.querySelector('.scene-image-btn[data-scene="'+i+'"]');
    if(btn){btn.disabled=true;btn.textContent='画像生成中…'}
    refreshNow();
    try{
      const r=await original(i);
      return r===undefined?true:r;
    }catch(e){
      s.image=oldImage; s.video=oldVideo; s.imageProvider=oldProvider;
      if(box&&oldImage)box.innerHTML='<img src="'+oldImage+'">';
      throw e;
    }finally{
      s._imageGenerating=false;
      if(ta)ta.value=oldPrompt;
      s.imagePrompt=oldPrompt;
      if(btn){btn.disabled=false;btn.textContent=oldImage?'画像を作り直す':'画像を作る'}
      refreshNow();
    }
  };
}
const oldRender=typeof render==='function'?render:null;
if(oldRender){
  render=function(){const r=oldRender.apply(this,arguments); setTimeout(()=>{
    document.querySelectorAll('.scene-image-btn').forEach((b)=>{
      const i=Number(b.dataset.scene);
      if(Number.isFinite(i)) b.textContent=project?.scenes?.[i]?.image?'画像を作り直す':'画像を作る';
    });
  },0); return r}
}
})();