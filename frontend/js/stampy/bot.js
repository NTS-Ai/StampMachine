/* ---------- Stampy, de NTS-robot en mascotte ----------
   Overgenomen uit het ontwerp (frontend/spel, ontwerp/stampy-robot.html).
   Gebruik:
     const bot = new Bot(hostElement, { bubble: true });   // tekent Stampy in het element
     bot.set('happy')            // gezicht: neutral, happy, cheer, sad, think
     bot.react('ok', 'Goed zo')  // reactie met animatie: ok, no, combo, think, poke, win
     bot.say('Hoi!')             // tekstballon (alleen met bubble: true)
     bot.stage(S.streak.count)   // upgrades op basis van je streak in dagen
     bot.destroy()               // opruimen als het scherm verdwijnt
   Mascot-hoek: <div class="mascot right"></div> als host geeft het ronde glazen hoekje. */

/* eslint-disable */
// @ts-nocheck -- compacte code uit het ontwerp
const BODY=`<g class="armL arm"><rect class="shell ol" x="38" y="132" width="16" height="42" rx="8"/><circle class="accent ol" cx="46" cy="177" r="8"/></g>
<g class="armR arm"><rect class="shell ol" x="146" y="132" width="16" height="42" rx="8"/><circle class="accent ol" cx="154" cy="177" r="8"/></g>
<rect class="accent ol" x="70" y="190" width="22" height="14" rx="6"/><rect class="accent ol" x="108" y="190" width="22" height="14" rx="6"/>
<rect class="shell ol" x="56" y="122" width="88" height="74" rx="28"/><rect class="plate ol" x="71" y="140" width="58" height="32" rx="10"/>
<text class="nts" x="100" y="162" font-size="17">NTS</text>
<rect class="armor accent ol" x="44" y="120" width="28" height="16" rx="8"/><rect class="armor accent ol" x="128" y="120" width="28" height="16" rx="8"/>
<line class="ol-line" x1="100" y1="40" x2="100" y2="21"/><circle class="bulb ol" cx="100" cy="15" r="8"/>
<rect class="accent ol" x="30" y="66" width="12" height="32" rx="6"/><rect class="accent ol" x="158" y="66" width="12" height="32" rx="6"/>
<rect class="shell ol" x="38" y="38" width="124" height="88" rx="36"/><rect class="screen" x="51" y="51" width="98" height="62" rx="24"/><g class="face"></g>`;
const BOT_GEO={lx:80,rx:120,ey:78,my:98};
function star5(cx,cy,r){const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;p.push((cx+Math.cos(a)*rr).toFixed(1)+","+(cy+Math.sin(a)*rr).toFixed(1))}return p.join(" ")}
function face(e){const {lx,rx,ey,my}=BOT_GEO,c=100;
  const pill=(x,h=18,dy=0)=>`<rect class="eye blink" x="${x-6}" y="${ey+dy-h/2}" width="12" height="${h}" rx="6"/>`;
  const arc=x=>`<path class="eye-line" d="M${x-8} ${ey+3} Q${x} ${ey-10} ${x+8} ${ey+3}"/>`;
  const brow=(a,b,c2,d)=>`<path class="eye-line thin" d="M${a} ${b} L${c2} ${d}"/>`;
  switch(e){
    case "happy":return arc(lx)+arc(rx)+`<path class="mouth-fill" d="M${c-11} ${my-3} Q${c} ${my+13} ${c+11} ${my-3} Z"/>`;
    case "cheer":return `<polygon class="eye" points="${star5(lx,ey,10)}"/><polygon class="eye" points="${star5(rx,ey,10)}"/><path class="mouth-fill" d="M${c-13} ${my-4} Q${c} ${my+16} ${c+13} ${my-4} Z"/>`;
    case "sad":return pill(lx,13,3)+pill(rx,13,3)+brow(lx-8,ey-9,lx+7,ey-14)+brow(rx-7,ey-14,rx+8,ey-9)+`<path class="mouth-line" d="M${c-8} ${my+5} Q${c} ${my-3} ${c+8} ${my+5}"/>`;
    case "think":return pill(lx,16,-2)+pill(rx,16,-2)+brow(lx-8,ey-14,lx+7,ey-12)+`<path class="mouth-line" d="M${c-6} ${my+2} L${c+8} ${my}"/>`;
    default:return pill(lx)+pill(rx)+`<path class="mouth-line" d="M${c-8} ${my} Q${c} ${my+6} ${c+8} ${my}"/>`;
  }}
const BOTS=[];let uid=0;
class Bot{
  constructor(host,{bubble=true}={}){this.id="b"+(++uid);
    host.innerHTML=(bubble?'<div class="bubble" aria-live="polite"></div>':"")+`<div class="host"><svg class="robot" viewBox="0 0 200 230" role="img" aria-label="Stampy"><defs>
      <linearGradient id="${this.id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFEFB8"/><stop offset=".5" stop-color="#F7C03C"/><stop offset="1" stop-color="#D98E10"/></linearGradient>
      <radialGradient id="${this.id}f" cx=".5" cy=".6" r=".5"><stop offset="0" stop-color="#FFE08A" stop-opacity=".95"/><stop offset=".55" stop-color="#FF9A2E" stop-opacity=".55"/><stop offset="1" stop-color="#FF5A1F" stop-opacity="0"/></radialGradient></defs>
      <ellipse class="aura" cx="100" cy="118" rx="92" ry="104" fill="url(#${this.id}f)"/><g class="bob">${BODY}</g></svg></div>`;
    if(!host.classList.contains("mascot"))host.querySelector(".host").style.width="100%";
    this.svg=host.querySelector("svg");this.faceEl=this.svg.querySelector(".face");this.bubble=host.querySelector(".bubble");
    this.svg.addEventListener("click",()=>this.react("poke"));this.set("neutral");BOTS.push(this)}
  set(e){this.expr=e;this.faceEl.innerHTML=face(e)}
  anim(a){const c=this.svg.classList;["anim-hop","anim-dance","anim-droop"].forEach(k=>c.remove(k));if(!a)return;void this.svg.getBoundingClientRect();c.add("anim-"+a);clearTimeout(this.at);this.at=setTimeout(()=>c.remove("anim-"+a),2300)}
  say(t,ms=2400){if(!this.bubble)return;this.bubble.textContent=t;this.bubble.classList.add("on");clearTimeout(this.bt);this.bt=setTimeout(()=>this.bubble.classList.remove("on"),ms)}
  react(k,text){clearTimeout(this.t);const m={ok:["happy","hop"],no:["sad","droop"],combo:["cheer","dance"],think:["think",null],poke:["happy","hop"],win:["cheer","dance"]}[k];
    this.set(m[0]);this.anim(m[1]);if(text)this.say(text);else if(k==="poke")this.say(randomOf(["Boop! Nog een level?","Ik ben er klaar voor.","Python? Ik spreek het vloeiend."]));
    if(k!=="think")this.t=setTimeout(()=>this.set("neutral"),2200)}
  /** Upgrades op basis van je streak in dagen: 3 antenne, 7 eerste vlam, 14 pantser, 21 super-aura (goud), 30 legendarisch. @param {number} days */
  stage(days){const c=this.svg.classList;["s3","s7","s14","s21","s30"].forEach(k=>c.remove(k));
    const d=Math.max(0,days|0);[3,7,14,21,30].forEach(s=>{if(d>=s)c.add("s"+s)});const gold=d>=21;this.days=d;
    this.svg.style.setProperty("--shell",gold?`url(#${this.id}g)`:"#F3F5FB");this.svg.style.setProperty("--accent-r",gold?"#9A6410":"#2B47F0");this.svg.style.setProperty("--plate",gold?"#4A3205":"#2B47F0")}
  /** Haalt deze Stampy weg (bijvoorbeeld als een scherm opnieuw wordt getekend). */
  destroy(){clearTimeout(this.t);clearTimeout(this.at);clearTimeout(this.bt);const i=BOTS.indexOf(this);if(i>=0)BOTS.splice(i,1)}
}
const UPGRADES=["Wakker","Antenne gloeit","Eerste vlam","Pantser-upgrade","Super-aura","Legendarisch"];
let rafE=0,mx=0,my=0;
addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY;if(!rafE)rafE=requestAnimationFrame(()=>{rafE=0;for(const b of BOTS){const r=b.svg.getBoundingClientRect();if(!r.width)continue;
  const dx=Math.max(-5,Math.min(5,(mx-r.left-r.width/2)/r.width*9)),dy=Math.max(-4,Math.min(4,(my-r.top-r.height*.35)/r.height*8));b.faceEl.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`}})},{passive:true});

/** Stampy op een scherm zetten, met upgrades volgens je huidige streak. @param {HTMLElement} host @param {{ bubble?: boolean }} [opts] */
function mountBot(host, opts) {
  const bot = new Bot(host, opts);
  bot.stage(typeof currentStreak === 'function' ? currentStreak() : 0);
  return bot;
}
