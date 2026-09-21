(()=>{
const STORY=`【全ページ共通：一本の物語としてナレーションを書く】\nPDFの各ページを別々の説明文として処理せず、最初から最後まで一本のドキュメンタリー映画・ストーリーとしてつながるナレーションにしてください。前ページの結論・疑問・原因・人物の判断を、次ページの冒頭へ自然につなげてください。「次に」「そして」「このページでは」の機械的な連発、ページごとの仕切り直し、箇条書きの読み上げは禁止です。冒頭で続きを知りたくなる問いや状況を作り、中盤に資料に基づく転換点・対立・意外性・変化を置き、終盤は冒頭の問いへ意味の上で戻って全体が腑に落ちる着地にしてください。文章は流暢で自然な話し言葉にし、短文のぶつ切りを避けます。ただし資料にない会話・心情・出来事・因果関係は創作せず、資料の正確さを最優先してください。各ページのpreviousContextは単なる要約ではなく、前ページから次ページへ渡す物語の糸として使ってください。全ページを続けて聞いた時に一つの作品になることを最優先してください。\n\n【すずゆう風を選んだ場合】各ページの最初の一文は、必ずそのページの内容に即した短い疑問文にしてください。最初の一文の末尾は必ず「？」にし、その問いの答えを追うように説明を続けてください。`;

function startsWithQuestion(text){
  const first=String(text||'').trim().split(/[。！!\n]/,1)[0]||'';
  return first.includes('？')||first.includes('?');
}
function questionFor(d,i){
  const title=String(d.getElementById('title-'+i)?.value||'').trim();
  if(i===0)return'この資料から、いったい何が見えてくるのでしょうか？';
  if(title&&!/^PAGE\s*\d+$/i.test(title))return`「${title}」から、何が見えてくるのでしょうか？`;
  return'ここで、いったい何が変わったのでしょうか？';
}
function enforceSuzuyu(d){
  if(d.getElementById('narStyle')?.value!=='suzuyu')return;
  [...d.querySelectorAll('textarea[id^="nar-"]')].forEach(n=>{
    const i=Number(n.id.slice(4)),text=n.value.trim();
    if(!text||n.dataset.suzuyuChecked===text)return;
    if(!startsWithQuestion(text)){
      const q=questionFor(d,i),next=q+'\n'+text;
      n.value=next;n.dispatchEvent(new Event('input',{bubbles:true}));
      const reading=d.getElementById('read-'+i);
      if(reading&&!startsWithQuestion(reading.value)){
        reading.value=q+'\n'+reading.value.trim();
        reading.dispatchEvent(new Event('input',{bubbles:true}));
      }
      n.dataset.suzuyuChecked=next;
    }else n.dataset.suzuyuChecked=text;
  });
}
function syncPipeline(d){
  const make=d.getElementById('makeNarration'),all=d.getElementById('allAudio'),status=d.getElementById('narStatus');
  if(!make||!all)return;
  const running=make.disabled&&/ChatGPT|資料を読んで|ナレーション/.test(status?.textContent||'');
  d.documentElement.dataset.narrationGenerating=running?'1':'0';
  const ready=[...d.querySelectorAll('textarea[id^="nar-"]')].filter(x=>x.value.trim()).length;
  if(ready>0&&all.dataset.audioRunning!=='1')all.disabled=false;
  all.dataset.readyNarrations=String(ready);
}
function install(){
  for(const f of document.querySelectorAll('iframe')){try{
    const d=f.contentDocument;if(!d)continue;
    const extra=d.getElementById('extra'),btn=d.getElementById('makeNarration');
    if(!extra||!btn)continue;
    if(btn.dataset.storyFlow2!=='1'){
      btn.dataset.storyFlow2='1';
      btn.addEventListener('click',()=>{
        const before=extra.value;
        extra.value=(before?before+'\n\n':'')+STORY;
        extra.dispatchEvent(new Event('input',{bubbles:true}));
        setTimeout(()=>{extra.value=before;extra.dispatchEvent(new Event('input',{bubbles:true}))},600);
      },true);
    }
    enforceSuzuyu(d);syncPipeline(d);
  }catch(e){}}
  setTimeout(install,250);
}
install();
})();
