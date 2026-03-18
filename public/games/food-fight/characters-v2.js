
// ═══════════════════════════════════════════════════════════════════════
// FOOD FIGHT v2.0 - NEW 6 CHARACTER ROSTER
// ═══════════════════════════════════════════════════════════════════════

// ── NEW CHARACTER ROSTER (6 fighters) ──────────────────────────────────
const CH=[
  // 0 HAMBURGER — BOXING FIGHTER
  {name:'HAMBURGER',spName:'MEGA PUNCH !!',color:'#e8a838',body:'#8b5a1a',skin:'#d4a574',pw:8,spd:6,def:7,
   sdesc:'Devastating boxing combo',
   doSp:(f,e)=>{spfx.push({type:'inferno',own:f.id,x:e.x+29,y:e.y+90,r:0,mr:140,life:48,dmg:48,hit:false});}},
  // 1 PIZZA — STRETCH PUNCH (long range)
  {name:'PIZZA',spName:'STRETCH SLAM !',color:'#f9c74f',body:'#d4a03a',skin:'#ffe0a0',pw:7,spd:8,def:5,
   sdesc:'Stretchy arm slam attack',
   doSp:(f,e)=>{spfx.push({type:'slash',own:f.id,dir:f.dir,cx:f.x+29+f.dir*68,cy:f.y+22,r:100,t:0,mt:28,color:'#ffee88',color2:'#e6a020',dmg:38,hit:false,life:42});}},
  // 2 TACO — TORNADO SPIN
  {name:'TACO',spName:'TORNADO SPIN !',color:'#f9c74f',body:'#c4a030',skin:'#ffe0a0',pw:8,spd:7,def:6,
   sdesc:'Spinning tornado rush attack',
   doSp:(f,e)=>{spfx.push({type:'tornado',own:f.id,x:f.x+(f.dir>0?60:-60),y:GFL+92,vx:f.dir*4.5,r:62,hits:0,dmg:8,life:78});}},
  // 3 SUSHI — SAMURAI SLASH (sword)
  {name:'SUSHI',spName:'SAMURAI SLASH !',color:'#2a5a3a',body:'#1a3a2a',skin:'#ffe0d0',pw:9,spd:7,def:5,
   sdesc:'Lightning fast blade slash',
   doSp:(f,e)=>{spfx.push({type:'slash',own:f.id,dir:f.dir,cx:f.x+29+f.dir*68,cy:f.y+22,r:115,t:0,mt:32,color:'#c0e0d0',color2:'#608080',dmg:45,hit:false,life:46});}},
  // 4 EMPANADA — BLADE DANCE (knife)
  {name:'EMPANADA',spName:'BLADE DANCE !',color:'#e8b86d',body:'#8b5e1a',skin:'#ffd8a8',pw:7,spd:9,def:5,
   sdesc:'Rapid knife strikes',
   doSp:(f,e)=>{[-.3,0,.3].forEach(a=>FP({x:f.x+(f.dir>0?f.w:0),y:f.y+22,w:18,h:18,vx:f.dir*12*Math.cos(a),vy:Math.sin(a)*4-1,color:'#d4c4a0',gc:'#a08060',dmg:16,own:f.id,life:90}));}},
  // 5 ALFAJOR — NUNCHAKU FLURRY
  {name:'ALFAJOR',spName:'FLURRY ATTACK !',color:'#c68642',body:'#7a4a20',skin:'#e8c898',pw:6,spd:8,def:7,
   sdesc:'Wild nunchaku spinning attack',
   doSp:(f,e)=>{spfx.push({type:'clones',own:f.id,ci:f.ci,dir:f.dir,sy:f.y,color:CH[5].color,
     clones:[{x:f.x,y:f.y-8,vx:f.dir*14,vy:-2,hit:false,d:0},{x:f.x,y:f.y,vx:f.dir*12,vy:0,hit:false,d:5},{x:f.x,y:f.y+8,vx:f.dir*10,vy:2,hit:false,d:10}],
     life:65});}},
];

// New emojis for the 6 characters
const EMOJIS=['🍔','🍕','🌮','🍣','🥟','🍪'];

// Sprite paths for the new characters
const SPRITES={
  hamburger:{path:'characters/hamburger/',frames:['idle','attack','damage','walk_0','walk_1','walk_2','walk_3']},
  pizza:{path:'characters/pizza/',frames:['idle','attack','damage','walk_0','walk_1','walk_2','walk_3']},
  taco:{path:'characters/taco/',frames:['idle','attack','damage','walk_0','walk_1','walk_2','walk_3']},
  sushi:{path:'characters/sushi/',frames:['idle','attack','damage','walk_0','walk_1','walk_2','walk_3']},
  empanada:{path:'characters/empanada/',frames:['idle','attack','damage','walk_0','walk_1','walk_2','walk_3']},
  alfajor:{path:'characters/alfajor/',frames:['idle','attack','damage','walk_0','walk_1','walk_2','walk_3']}
};

// Updated stages (6 stages for 6 characters)
const STAGES=[
  // Hamburger - Burger Joint
  f=>{ctx.fillStyle='#1a1208';ctx.fillRect(0,0,GW,GH);for(let x=0;x<GW;x+=60)for(let y=0;y<320;y+=60){ctx.fillStyle=(Math.floor(x/60+y/60)%2===0)?'#2a2010':'#1a1208';ctx.fillRect(x,y,60,60);}for(let i=0;i<6;i++){ctx.fillStyle='#e8a838';ctx.beginPath();ctx.arc(100+i*120,80+Math.sin(f*.05+i)*10,25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a3a10';ctx.fillRect(100+i*120-5,80,10,200);}ctx.fillStyle='#3a2a10';ctx.fillRect(0,374,GW,GH-374);ctx.save();ctx.shadowColor='#e8a838';ctx.shadowBlur=22;ctx.fillStyle='#ffcc00';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('✦  BURGER JOINT  ✦',GW/2,26);ctx.restore();},
  // Pizza - Pizzeria  
  f=>{ctx.fillStyle='#120500';ctx.fillRect(0,0,GW,GH);for(let row=0;row<5;row++)for(let col=0;col<14;col++){const bx=col*62+(row%2)*31,by=row*52;ctx.fillStyle=row%2===0?'#6b1a0a':'#7c2212';ctx.fillRect(bx,by,59,48);ctx.strokeStyle='#1e0500';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,59,48);}ctx.fillStyle='#4a2a0a';ctx.fillRect(580,185,180,170);ctx.fillStyle='#1a0800';ctx.beginPath();ctx.arc(670,225,56,Math.PI,0);ctx.fill();const fa=.45+Math.sin(f*.09)*.35;ctx.fillStyle=`rgba(255,110,0,${fa})`;ctx.beginPath();ctx.arc(670,225,42,Math.PI,0);ctx.fill();ctx.fillStyle='#220f00';ctx.fillRect(0,374,GW,GH-374);ctx.save();ctx.shadowColor='#f80';ctx.shadowBlur=24;ctx.fillStyle='#ff8800';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('✦  PIZZERIA  ✦',GW/2,26);ctx.restore();},
  // Taco - Taco Stand
  f=>{ctx.fillStyle='#0e0900';ctx.fillRect(0,0,GW,GH);for(let i=0;i<60;i++){const sx=(i*137)%GW,sy=(i*97)%220;ctx.fillStyle=`rgba(255,255,255,${.2+Math.sin(f*.06+i)*.25})`;ctx.fillRect(sx,sy,2,2);}const stripe=['#f9c74f','#c4a030'];for(let i=0;i<16;i++){ctx.fillStyle=stripe[i%2];ctx.fillRect(i*54,62,54,46);}ctx.fillStyle='#7a3a00';ctx.fillRect(0,108,GW,7);for(let i=0;i<5;i++){const lx=80+i*166,ly=52;ctx.save();ctx.shadowColor='#f9c74f';ctx.shadowBlur=14+Math.sin(f*.07+i)*5;ctx.fillStyle='#f9c74f';ctx.beginPath();ctx.ellipse(lx,ly,11,16,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.strokeStyle='#7a3a00';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,36);ctx.stroke();}ctx.fillStyle='#1e1000';ctx.fillRect(0,374,GW,GH-374);ctx.save();ctx.shadowColor='#fa0';ctx.shadowBlur=20;ctx.fillStyle='#ffbb00';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('✦  TACO STAND  ✦',GW/2,28);ctx.restore();},
  // Sushi - Sushi Bar
  f=>{ctx.fillStyle='#030610';ctx.fillRect(0,0,GW,GH);for(let p=0;p<5;p++){const px=p*172,pw=162;ctx.fillStyle='rgba(255,235,200,.05)';ctx.fillRect(px,0,pw,320);ctx.strokeStyle='rgba(180,140,100,.18)';ctx.lineWidth=1.5;ctx.strokeRect(px+5,5,pw-10,310);for(let y=22;y<310;y+=35){ctx.beginPath();ctx.moveTo(px+5,y);ctx.lineTo(px+pw-5,y);ctx.stroke();}for(let x=px+46;x<px+pw-10;x+=42){ctx.beginPath();ctx.moveTo(x,5);ctx.lineTo(x,310);ctx.stroke();}}for(let i=0;i<24;i++){const bx=(i*137+f*.9)%GW,by=(i*97+f*.35)%320;ctx.fillStyle='rgba(255,180,200,.55)';ctx.beginPath();ctx.arc(bx,by,2.5,0,Math.PI*2);ctx.fill();}for(let i=0;i<4;i++){const lx=90+i*202,ly=46;ctx.save();ctx.shadowColor='#ff2200';ctx.shadowBlur=14+Math.sin(f*.06+i)*4;ctx.fillStyle='#cc0000';ctx.beginPath();ctx.ellipse(lx,ly,13,19,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#0e0c06';ctx.fillRect(0,374,GW,GH-374);ctx.save();ctx.shadowColor='#ff3300';ctx.shadowBlur=20;ctx.fillStyle='#ff4444';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('✦  SUSHI BAR  ✦',GW/2,28);ctx.restore();},
  // Empanada - Street Market
  f=>{ctx.fillStyle='#0e0900';ctx.fillRect(0,0,GW,GH);const stripe=['#e8b86d','#c68642'];for(let i=0;i<16;i++){ctx.fillStyle=stripe[i%2];ctx.fillRect(i*54,62,54,46);}for(let i=0;i<5;i++){const lx=80+i*166,ly=52;ctx.save();ctx.shadowColor='#e8b86d';ctx.shadowBlur=14+Math.sin(f*.07+i)*5;ctx.fillStyle='#e8b86d';ctx.beginPath();ctx.ellipse(lx,ly,11,16,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#1e1000';ctx.fillRect(0,374,GW,GH-374);ctx.save();ctx.shadowColor='#e8b86d';ctx.shadowBlur=20;ctx.fillStyle='#ffcc88';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('✦  STREET MARKET  ✦',GW/2,28);ctx.restore();},
  // Alfajor - Sweet Shop
  f=>{ctx.fillStyle='#100616';ctx.fillRect(0,0,GW,GH);for(let x=0;x<GW;x+=28){ctx.fillStyle=`hsl(${x*4+f*.15},55%,${x%56===0?20:16}%)`;ctx.fillRect(x,0,26,320);}ctx.fillStyle='#2e1828';ctx.fillRect(50,235,700,95);ctx.fillStyle='rgba(200,200,255,.1)';ctx.fillRect(55,240,690,85);const dcols=['#c68642','#e8c898','#d4a574','#a08060','#7a4a20'];for(let i=0;i<7;i++){const dx=100+i*96,dy=278;ctx.fillStyle='#b8621a';ctx.beginPath();ctx.arc(dx,dy,17,0,Math.PI*2);ctx.fill();ctx.fillStyle=dcols[i%5];ctx.beginPath();ctx.arc(dx,dy,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#100616';ctx.beginPath();ctx.arc(dx,dy,5,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#1e0a1a';ctx.fillRect(0,374,GW,GH-374);ctx.save();ctx.shadowColor='#c68642';ctx.shadowBlur=24+Math.sin(f*.07)*7;ctx.fillStyle='#c68642';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('✦  SWEET SHOP  ✦',GW/2,28);ctx.restore();}
];

// Updated drawHead for 6 characters
function dHead(ci,cx,cy,r,dir){
  ctx.save();
  switch(ci){
    // HAMBURGER - brown bun with sesame
    case 0:{ctx.fillStyle='#e8a838';ctx.beginPath();ctx.arc(cx,cy+r*.1,r*.9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c68642';ctx.beginPath();ctx.arc(cx,cy+r*.15,r*.75,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const a=i/8*Math.PI*2;ctx.fillStyle='#f9d898';ctx.beginPath();ctx.arc(cx+Math.sin(a)*r*.55,cy+r*.1+Math.cos(a)*r*.55,r*.08,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#2a5a1a';ctx.fillRect(cx-r*.5,cy+r*.2,r,r*.15);ctx.fillStyle='#ff4444';ctx.fillRect(cx-r*.4,cy+r*.35,r*.8,r*.1);break;}
    // PIZZA - yellow slice with pepperoni
    case 1:{ctx.fillStyle='#f9c74f';ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r*.8,cy+r*.6);ctx.lineTo(cx-r*.8,cy+r*.6);ctx.closePath();ctx.fill();ctx.fillStyle='#e03030';[[-r*.2,-r*.2],[r*.3,r*.1],[-r*.1,r*.4],[r*.4,-r*.1]].forEach(([ox,oy])=>{ctx.beginPath();ctx.arc(cx+ox,cy+oy,r*.15,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#c4a030';ctx.fillRect(cx-r*.9,cy+r*.55,r*1.8,r*.15);break;}
    // TACO - yellow shell with green
    case 2:{ctx.fillStyle='#f9c74f';ctx.beginPath();ctx.arc(cx,cy+r*.16,r*.9,Math.PI,0);ctx.closePath();ctx.fill();ctx.fillStyle='#5a2800';ctx.beginPath();ctx.arc(cx,cy+r*.16,r*.74,Math.PI+.14,-.14);ctx.closePath();ctx.fill();ctx.fillStyle='#2ecc40';ctx.beginPath();ctx.arc(cx,cy+r*.16,r*.58,Math.PI+.28,-.28);ctx.closePath();ctx.fill();ctx.fillStyle='#e63946';for(const ox of[-r*.32,0,r*.32]){ctx.beginPath();ctx.arc(cx+ox,cy-r*.15,r*.1,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#9a6010';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(cx,cy+r*.16,r*.9,Math.PI+.04,-.04);ctx.stroke();break;}
    // SUSHI - green samurai armor
    case 3:{const sg=ctx.createLinearGradient(cx-r*.82,cy-r*.75,cx+r*.82,cy+r*.75);sg.addColorStop(0,'#3a7a4a');sg.addColorStop(.5,'#2a5a3a');sg.addColorStop(1,'#1a3a2a');ctx.fillStyle=sg;if(ctx.roundRect)ctx.roundRect(cx-r*.8,cy-r*.75,r*1.6,r*1.5,r*.2);else ctx.rect(cx-r*.8,cy-r*.75,r*1.6,r*1.5);ctx.fill();ctx.fillStyle='#e8c898';ctx.beginPath();ctx.ellipse(cx,cy-r*.1,r*.5,r*.6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c02020';ctx.beginPath();ctx.arc(cx,cy-r*.75,r*.25,0,Math.PI*2);ctx.fill();break;}
    // EMPANADA - golden pastry
    case 4:{ctx.fillStyle='#e8b86d';ctx.beginPath();ctx.arc(cx,cy+r*.2,r*.9,Math.PI,0);ctx.closePath();ctx.fill();const eg=ctx.createLinearGradient(cx-r,cy-r*.2,cx+r,cy+r*.2);eg.addColorStop(0,'rgba(255,220,140,.5)');eg.addColorStop(1,'rgba(180,100,20,.3)');ctx.fillStyle=eg;ctx.beginPath();ctx.arc(cx,cy+r*.2,r*.9,Math.PI,0);ctx.closePath();ctx.fill();ctx.fillStyle='#c68642';for(let i=0;i<=10;i++){const a=Math.PI+(i/10)*Math.PI;ctx.beginPath();ctx.arc(cx+Math.cos(a)*r*.88,cy+r*.2+Math.sin(a)*r*.88,r*.065,0,Math.PI*2);ctx.fill();}break;}
    // ALFAJOR - brown cookie with filling
    case 5:{ctx.fillStyle='#c68642';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e8c898';ctx.beginPath();ctx.arc(cx,cy,r*.84,0,Math.PI*2);ctx.fill();for(let i=0;i<6;i++){const a=i/6*Math.PI*2,dx=cx+Math.cos(a)*r*.72,dy=cy+Math.sin(a)*r*.72;ctx.fillStyle='#a07040';ctx.beginPath();ctx.ellipse(dx,dy,r*.07,r*.14,a,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#f0e0c0';ctx.beginPath();ctx.arc(cx,cy,r*.3,0,Math.PI*2);ctx.fill();break;}
  }
  ctx.restore();
}
