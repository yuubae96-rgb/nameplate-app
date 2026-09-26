import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS=new Set(["https://yuubae96-rgb.github.io"]);
const TARGET="https://vnnvuxccazkdzwqjmntz.supabase.co/functions/v1/youtube-video-maker";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

function cors(req:Request){const o=req.headers.get("origin")||"";return{"Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(o)?o:"","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
const json=(d:unknown,s:number,h:Record<string,string>)=>new Response(JSON.stringify(d),{status:s,headers:{...h,"Content-Type":"application/json"}});

async function hashText(s:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}

async function persistentGuard(kind:"tts"|"image",body:any){
  if(!SUPABASE_URL||!SERVICE_ROLE_KEY)throw new Error("安全装置エラー：永続回数制限の設定を確認できないため有料生成を停止しました。");
  let signature:string|null=null;
  if(kind==="tts")signature=await hashText(JSON.stringify({text:String(body.text||""),voice:String(body.fishVoiceId||body.voice||""),direction:String(body.direction||""),model:String(body.model||"gemini-3.8-flash-lite-tts")}));
  const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/youtube_api_guard`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "apikey":SERVICE_ROLE_KEY,
      "Authorization":`Bearer ${SERVICE_ROLE_KEY}`
    },
    body:JSON.stringify({p_kind:kind,p_signature:signature})
  });
  const txt=await r.text();
  let d:any;try{d=JSON.parse(txt)}catch{throw new Error("安全装置エラー：利用回数の確認に失敗したため有料生成を停止しました。")} 
  if(!r.ok)throw new Error("安全装置エラー：利用回数DBへ接続できないため有料生成を停止しました。");
  if(!d?.allowed){
    if(d?.reason==="duplicate")throw new Error("安全装置：同じ音声の重複生成を防止しました。90秒以内の同一内容の再生成はできません。");
    throw new Error(`安全装置：${kind==="tts"?"音声":"画像"}生成が10分間に20回に達したため停止しました。しばらく待ってから必要なものだけ生成してください。`);
  }
}

Deno.serve(async(req:Request)=>{
  const h=cors(req);
  if(req.method==="OPTIONS")return new Response("ok",{headers:h});
  const origin=req.headers.get("origin")||"";
  if(!ALLOWED_ORIGINS.has(origin))return json({error:"Forbidden origin"},403,h);
  if(req.method!=="POST")return json({error:"Method not allowed"},405,h);
  try{
    const text=await req.text();
    let body:any={};try{body=JSON.parse(text)}catch{throw new Error("Invalid JSON")}
    const action=String(body.action||"");
    if(action==="listFishVoices"){
      const key=Deno.env.get("FISH_API_KEY")||"";
      if(!key)return json({error:"Fish AudioのAPIキーが未設定です。"},503,h);
      const page=Math.min(30,Math.max(1,Math.floor(Number(body.page)||1)));
      const title=String(body.query||"").trim().slice(0,80);
      const url=new URL("https://api.fish.audio/model");
      url.searchParams.set("page_size","40");url.searchParams.set("page_number",String(page));
      url.searchParams.set("language","ja");url.searchParams.set("sort_by","task_count");
      if(title)url.searchParams.set("title",title);
      const r=await fetch(url,{headers:{"Authorization":`Bearer ${key}`},signal:AbortSignal.timeout(10000)});
      if(!r.ok)return json({error:`Fish Audioの声一覧を取得できませんでした（HTTP ${r.status}）。`},r.status,h);
      const result=await r.json();
      const items=(Array.isArray(result.items)?result.items:[]).filter((v:any)=>/^[a-f0-9]{32}$/i.test(String(v._id||""))).map((v:any)=>({id:v._id,title:String(v.title||"名称なし").slice(0,90),description:String(v.description||"").slice(0,180),author:String(v.author?.nickname||"").slice(0,50),licensed:Boolean(v.licensed)}));
      return json({items,total:Number(result.total||0),hasMore:Boolean(result.has_more)&&page<30,page},200,h);
    }
    if(action==="generateTts" && body.ttsProvider==="fish") {
      await persistentGuard("tts",body);
      const key=Deno.env.get("FISH_API_KEY")||"";
      if(!key)return json({error:"Fish AudioのAPIキーが未設定です。管理者がSupabaseのSecretsにFISH_API_KEYを登録してください。"},503,h);
      const speech=String(body.text||"").trim();
      if(!speech||speech.length>5000)return json({error:"音声原稿は1〜5000文字で入力してください。"},400,h);
      const voiceId=String(body.fishVoiceId||body.voice||"297a6fd278df47c3b9da9bfdf55ac89a");
      if(!/^[a-f0-9]{32}$/i.test(voiceId))return json({error:"Fish Audioの声IDを確認してください。"},400,h);
      const result=await fetch(body.fishTimestamps?"https://api.fish.audio/v1/tts/stream/with-timestamp":"https://api.fish.audio/v1/tts",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json","model":"s2.1-pro-free"},body:JSON.stringify({text:speech,reference_id:voiceId,format:"mp3",latency:"normal"})});
      if(!result.ok){let error="";try{const d=await result.json();error=String(d.message||d.error||"").slice(0,180)}catch{}return json({error:`Fish Audio HTTP ${result.status}: ${error||"音声生成に失敗しました。"}`},result.status,h)}
      let timeline:any[]=[];
      let audio:Uint8Array;
      if(body.fishTimestamps){
        const events=(await result.text()).split(/\r?\n\r?\n/);
        const chunks:Uint8Array[]=[];const snapshots=new Map<number,any>();
        for(const frame of events){const line=frame.split(/\r?\n/).find(x=>x.startsWith("data:"));if(!line)continue;let event:any;try{event=JSON.parse(line.slice(5).trim())}catch{continue}
          if(event.audio_base64){const bin=atob(event.audio_base64),part=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)part[i]=bin.charCodeAt(i);chunks.push(part)}
          if(event.alignment?.segments)snapshots.set(Number(event.chunk_seq)||0,{offset:Number(event.chunk_audio_offset_sec)||0,segments:event.alignment.segments});
        }
        audio=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const part of chunks){audio.set(part,offset);offset+=part.length}
        timeline=[...snapshots.entries()].sort((a,b)=>a[0]-b[0]).flatMap(([,snap])=>snap.segments.map((seg:any)=>({text:String(seg.text||""),start:snap.offset+Number(seg.start||0),end:snap.offset+Number(seg.end||0)})));
      }else audio=new Uint8Array(await result.arrayBuffer());
      if(!audio.length)return json({error:"Fish Audioから音声が返されませんでした。"},502,h);
      let encoded="";for(let i=0;i<audio.length;i+=8192)encoded+=String.fromCharCode(...audio.subarray(i,i+8192));
      return json({mimeType:"audio/mpeg",data:btoa(encoded),voice:voiceId,provider:"fish",model:"s2.1-pro-free",leadingSilenceMs:0,alignment:timeline},200,h);
    }
    if(action==="generateTts")await persistentGuard("tts",body);
    if(action==="generateImage")await persistentGuard("image",body);
    const r=await fetch(TARGET,{method:"POST",headers:{"Content-Type":"application/json","Origin":"https://yuubae96-rgb.github.io"},body:text});
    const out=await r.text();
    return new Response(out,{status:r.status,headers:{...h,"Content-Type":r.headers.get("content-type")||"application/json"}});
  }catch(e){
    const msg=String((e as any)?.message||e);
    const status=msg.startsWith("安全装置")?429:500;
    return json({error:msg},status,h)
  }
});
