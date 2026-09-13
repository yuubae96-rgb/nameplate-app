(()=>{
const STORY=`【全ページ共通：一本の物語としてナレーションを書く】\nPDFの各ページを別々の説明文として処理せず、最初から最後まで一本のドキュメンタリー映画・ストーリーとしてつながるナレーションにしてください。前ページの結論・疑問・原因・人物の判断を、次ページの冒頭へ自然につなげてください。「次に」「そして」「このページでは」の機械的な連発、ページごとの仕切り直し、箇条書きの読み上げは禁止です。冒頭で続きを知りたくなる問いや状況を作り、中盤に資料に基づく転換点・対立・意外性・変化を置き、終盤は冒頭の問いへ意味の上で戻って全体が腑に落ちる着地にしてください。文章は流暢で自然な話し言葉にし、短文のぶつ切りを避けます。ただし資料にない会話・心情・出来事・因果関係は創作せず、資料の正確さを最優先してください。各ページのpreviousContextは単なる要約ではなく、前ページから次ページへ渡す物語の糸として使ってください。全ページを続けて聞いた時に一つの作品になることを最優先してください。`;
function install(){
  const frames=[...document.querySelectorAll('iframe')];
  for(const f of frames){try{
    const d=f.contentDocument;if(!d)continue;
    const extra=d.getElementById('extra'),btn=d.getElementById('makeNarration');
    if(!extra||!btn||btn.dataset.storyFlow2==='1')continue;
    btn.dataset.storyFlow2='1';
    btn.addEventListener('click',()=>{const before=extra.value;extra.value=(before?before+'\n\n':'')+STORY;extra.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>{extra.value=before;extra.dispatchEvent(new Event('input',{bubbles:true}))},600)},true);
  }catch(e){}}
  setTimeout(install,500);
}
install();
})();
