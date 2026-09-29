(()=>{
const CHATGPT_PROMPT=`添付したPDF全体の内容と各ページの意図を理解して、最初から最後まで話が自然につながるプレゼン用ナレーションを作ってください。

【重要】
・PDFファイル名、拡張子、添付ファイル名はナレーション本文に絶対に入れないでください。
・「1ページ目」「2ページ目」などのページ番号は読み上げ本文に入れないでください。
・資料の文字をそのまま棒読みせず、意味を理解して分かりやすく説明してください。
・前のページから次のページへ自然につながる文章にしてください。
・各ページには、そのページで実際に読み上げるナレーションだけを書いてください。
・タイトル、ファイル名、ページ番号、注釈など、読み上げ不要の情報は除外してください。

出力形式：
【1ページ】
（1ページ目で読み上げる文章）

【2ページ】
（2ページ目で読み上げる文章）

この形式で最後のページまで作成してください。`;

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
    if(d.__pastedNarrationPages?.has(i))return;
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

function installPasteNarration(d){
  if(d.getElementById('pasteNarrationCard'))return;
  const extra=d.getElementById('extra'),make=d.getElementById('makeNarration');
  if(!extra||!make)return;
  const card=d.createElement('div');
  card.id='pasteNarrationCard';
  card.className='mode';
  card.style.marginTop='12px';
  card.innerHTML='<h3 style="margin:0 0 8px">ChatGPTで作ったナレーションを貼り付ける</h3><div class="hint" style="margin-bottom:8px">下の指示文をChatGPTへそのままコピーして使えます。PDF名やページ番号は読み上げ本文に入れない指定です。</div><textarea id="chatgptPrompt" readonly style="min-height:220px"></textarea><button type="button" class="btn blue full" id="copyChatgptPrompt" style="margin:8px 0 12px">ChatGPTへの指示をコピー</button><div class="hint" style="margin-bottom:8px">ChatGPTの回答を「1ページ」「2ページ」…の見出し付きのまま全部貼り付けてください。各ページへ自動で振り分けます。</div><textarea id="bulkNarrationPaste" placeholder="ここにChatGPTで作った全ページのナレーションをそのまま貼り付け"></textarea><button type="button" class="btn green full" id="applyBulkNarration" style="margin-top:8px">貼り付けた文章を全ページに反映</button><div id="bulkNarrationStatus" class="status"></div>';
  make.parentElement.insertBefore(card,make);
  d.getElementById('chatgptPrompt').value=CHATGPT_PROMPT;
  d.getElementById('copyChatgptPrompt').onclick=async()=>{const b=d.getElementById('copyChatgptPrompt');try{await d.defaultView.navigator.clipboard.writeText(CHATGPT_PROMPT);b.textContent='✓ コピーしました';setTimeout(()=>b.textContent='ChatGPTへの指示をコピー',1600)}catch(e){const t=d.getElementById('chatgptPrompt');t.focus();t.select();d.execCommand('copy');b.textContent='✓ コピーしました';setTimeout(()=>b.textContent='ChatGPTへの指示をコピー',1600)}};
  const parse=(raw,count)=>{
    const text=String(raw||'').replace(/\r/g,'').trim();
    if(!text)return[];
    const re=/^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[【\[]?[ \t　]*(?:第[ \t]*)?([0-9０-９]{1,3})[ \t　]*ページ(?:目)?[ \t　]*[】\]]?(?:\*\*)?(?:[ \t　]*[:：\-―ー].*)?[ \t　]*$/gm;
    const hits=[...text.matchAll(re)];
    if(!hits.length)return count===1?[text]:[];
    const out=Array(count).fill('');
    hits.forEach((m,k)=>{
      const page=Number(m[1].replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)))-1;
      if(page<0||page>=count)throw Error('PDFに存在しないページ番号があります：'+(page+1)+'ページ');
      if(out[page])throw Error('ページ見出しが重複しています：'+(page+1)+'ページ');
      const start=m.index+m[0].length,end=k+1<hits.length?hits[k+1].index:text.length;
      out[page]=text.slice(start,end).trim().replace(/^[-–—―]+\s*/,'').trim();
      if(!out[page])throw Error((page+1)+'ページの本文が空です。');
    });
    return out;
  };
  d.getElementById('applyBulkNarration').onclick=()=>{
    const areas=[...d.querySelectorAll('textarea[id^="nar-"]')];
    const status=d.getElementById('bulkNarrationStatus');
    if(!areas.length){status.textContent='先にPDFを読み込んでください。';return}
    if(d.documentElement.dataset.narrationGenerating==='1'||d.getElementById('makeNarration')?.disabled){status.textContent='ナレーション作成を停止してから反映してください。';return}
    let parts;try{parts=parse(d.getElementById('bulkNarrationPaste').value,areas.length)}catch(e){status.textContent=e.message;return}
    const filled=parts.filter(Boolean).length;
    if(!filled){status.textContent='ページ見出しを認識できませんでした。「1ページ」「2ページ」…を付けた原稿を貼り付けてください。';return}
    parts.forEach((txt,i)=>{
      if(!txt)return;
      txt=sanitizeSpeechText(d,txt);
      if(!d.__pastedNarrationPages)d.__pastedNarrationPages=new Set();
      d.__pastedNarrationPages.add(i);
      const nar=d.getElementById('nar-'+i),read=d.getElementById('read-'+i);
      const InputEvent=d.defaultView?.Event||Event;
      if(nar){nar.value=txt;nar.dispatchEvent(new InputEvent('input',{bubbles:true}))}
      if(read){read.value=txt;read.dispatchEvent(new InputEvent('input',{bubbles:true}))}
    });
    try{d.defaultView?.render&&d.defaultView.render()}catch(e){}
    const all=d.getElementById('allAudio');if(all)all.disabled=false;
    status.textContent=filled+' / '+areas.length+'ページにナレーションを反映しました。'+(filled<areas.length?'見出しのないページは変更していません。':'')+'貼り付けた文章はそのまま使います。下の「全ページのAI音声を作る」で音声を作成してください。';
  };
}
function sanitizeSpeechText(d,text){
  let s=String(text||'').replace(/\r/g,'');
  const file=d.getElementById('pdfFile')?.files?.[0]?.name||'';
  if(file){
    const esc=file.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
    s=s.replace(new RegExp(esc,'gi'),' ');
    const base=file.replace(/\.pdf$/i,'');
    if(base){const eb=base.replace(/[.*+?^$()|[\]\\]/g,'\\$&');s=s.replace(new RegExp(eb+'(?:\\.pdf)?','gi'),' ')}
  }
  s=s.replace(/[^\s\n「」『』【】<>]{2,}\.pdf\b/gi,' ')
     .replace(/^\s*(?:【|\[|#*\s*)?(?:第\s*)?[0-9０-９]{1,3}\s*ページ(?:目)?(?:】|\])?\s*[:：\-―ー]?\s*$/gm,'')
     .replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ').trim();
  return s;
}
function installSpeechGuard(d){
  const w=d.defaultView;
  if(typeof w?.makeAudio==='function'&&!w.makeAudio.__filenameGuard){
    const original=w.makeAudio;
    const guarded=function(...args){
      const i=args[0];
      for(const id of ['nar-'+i,'read-'+i]){
        const el=d.getElementById(id);
        if(!el)continue;
        const cleaned=sanitizeSpeechText(d,el.value);
        if(cleaned!==el.value){el.value=cleaned;el.dispatchEvent(new w.Event('input',{bubbles:true}))}
      }
      return original.apply(this,args);
    };
    guarded.__filenameGuard=true;w.makeAudio=guarded;
  }
  if(d.documentElement.dataset.speechGuard==='1')return;
  d.documentElement.dataset.speechGuard='1';
  const cleanAll=()=>{
    [...d.querySelectorAll('textarea[id^="nar-"],textarea[id^="read-"]')].forEach(el=>{
      const cleaned=sanitizeSpeechText(d,el.value);
      if(cleaned!==el.value){el.value=cleaned;el.dispatchEvent(new (d.defaultView?.Event||Event)('input',{bubbles:true}))}
    });
  };
  d.addEventListener('click',e=>{
    const t=e.target?.closest?.('#allAudio,button[id^="audioBtn-"]');
    if(t)cleanAll();
  },true);
}
function walkDocs(d){
  try{installPasteNarration(d)}catch(e){}
  try{installSpeechGuard(d)}catch(e){}
  try{for(const f of d.querySelectorAll('iframe'))if(f.contentDocument)walkDocs(f.contentDocument)}catch(e){}
}

function install(){
  walkDocs(document);
  for(const f of document.querySelectorAll('iframe')){try{
    const d=f.contentDocument;if(!d)continue;
    const extra=d.getElementById('extra'),btn=d.getElementById('makeNarration');
    if(!extra||!btn)continue;
    if(btn.dataset.storyFlow2!=='1'){
      btn.dataset.storyFlow2='1';
      btn.addEventListener('click',()=>{
        d.__pastedNarrationPages?.clear();
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
