(()=>{
const STORY_FLOW=`【全動画共通：一本の映画・物語として書く】
この動画の文章・ナレーションは、SCENEごとの箇条書き解説ではなく、最初から最後まで一本のドキュメンタリー映画・物語を見ているような流れにする。
・冒頭で視聴者が「この先どうなるのか」と知りたくなる問い、違和感、状況、人物の選択などを置く。ただし事実にない出来事や台詞を創作しない。
・各SCENEを独立した説明文にしない。前のSCENEの結末・疑問・原因が、次のSCENEの冒頭へ自然につながるように書く。
・「次に〜」「そして〜」「さらに〜」の機械的な連発や、年表・項目の読み上げを避ける。
・背景→人物や社会の動機→出来事→変化→対立や転換点→結果→意味、という因果関係を一本の流れとして描く。
・中盤には、史実に基づく転換点、意外性、対立、判断、状況の変化を置き、物語に起伏を作る。
・終盤は単なるまとめで終えず、冒頭の問いや状況へ意味の上で戻り、「だからこの出来事は何だったのか」が腑に落ちる余韻ある着地にする。
・文章は流暢で自然な日本語にし、短文のぶつ切りを避ける。一文を無闇に長くせず、耳で聞いて理解しやすいリズムにする。
・説明の正確さは絶対に落とさない。映画的に見せるための架空の会話、心情、事件、因果関係は作らない。不明なことは断定しない。
・SCENEタイトルよりもナレーション同士の連続性を重視し、全SCENEを通読した時に一つの作品として成立させる。
・同じ内容・同じ結論を別SCENEで言い換えて繰り返さない。
・視聴者に説明しているというより、史実の中へ連れていくような語り口を目指す。`;
function getDoc(){try{const m=document.getElementById('main');const md=m?.contentDocument;const c=md?.getElementById('core');const cd=c?.contentDocument;const a=cd?.getElementById('app');return a?.contentDocument||null}catch(e){return null}}
function install(){const d=getDoc();if(!d){setTimeout(install,400);return}if(d.documentElement.dataset.storyFlowStandard==='1')return;const make=d.getElementById('makeScript'),extra=d.getElementById('extra');if(!make||!extra){setTimeout(install,400);return}d.documentElement.dataset.storyFlowStandard='1';make.addEventListener('click',()=>{const before=extra.value;extra.value=(before?before+'\n\n':'')+STORY_FLOW;extra.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>{extra.value=before;extra.dispatchEvent(new Event('input',{bubbles:true}))},350)},true)}
window.addEventListener('load',()=>setTimeout(install,300));install();
})();
