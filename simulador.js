(async function(){
const [K,PT]=await Promise.all(['assets/territorio_kennedy.geojson','assets/territorio_puntos.geojson'].map(u=>fetch(u).then(r=>r.json())));
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const $=s=>document.querySelector(s);
/* ---------- entorno: Kennedy en metros ---------- */
const kgeom=K.features?K.features[0].geometry:K.geometry;
const [[x0,y0],[x1,y1]]=d3.geoBounds({type:'Feature',geometry:kgeom});
const lon0=(x0+x1)/2,lat0=(y0+y1)/2,MX=111320*Math.cos(lat0*Math.PI/180),MY=110540;
const W=([lon,lat])=>[(lon-lon0)*MX,(lat0-lat)*MY];
const ring=(kgeom.type==='Polygon'?kgeom.coordinates[0]:kgeom.coordinates[0][0]).map(W);
const feats=PT.features;const pts=c=>feats.filter(f=>f.properties.c===c).map(f=>({ll:f.geometry.coordinates,p:W(f.geometry.coordinates),n:f.properties.n}));
const rnd=d3.randomLcg(7);const pick=(a,n)=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b.slice(0,n)};
const HUERTAS=pick(pts('huerta'),160).map((h,i)=>({...h,i,yield:0,poll:0}));
const BARRIOS=pts('jac').map(b=>({...b,kind:'barrio',dem:1}));
const COMED=feats.filter(f=>f.properties.c==='sdis'&&/^Comedor/.test(f.properties.n||'')).map(f=>({ll:f.geometry.coordinates,p:W(f.geometry.coordinates),n:f.properties.n,kind:'comedor',dem:3}));
const COLE=pts('colegio').map(c=>({...c,kind:'colegio',dem:2}));
const DEMAND=[...BARRIOS,...COMED,...COLE];
const HUM=pts('hum').map(h=>({...h,r0:h.n.includes('Vaca')?180:140}));
const CORA=W([-74.1590,4.6295]),DIST=W([-74.1538,4.6318]);
// acopios propuestos: centros de las huertas (k-medias, 4 grupos)
const ACOP=(()=>{let c=pick(HUERTAS,4).map(h=>h.p.slice());for(let it=0;it<12;it++){const g=c.map(()=>[]);HUERTAS.forEach(h=>{let bi=0,bd=1e18;c.forEach((q,i)=>{const d=(q[0]-h.p[0])**2+(q[1]-h.p[1])**2;if(d<bd){bd=d;bi=i}});g[bi].push(h)});c=g.map((a,i)=>a.length?[d3.mean(a,h=>h.p[0]),d3.mean(a,h=>h.p[1])]:c[i])}return c.map((p,i)=>({p,stock:0,i}))})();
const near=(arr,p)=>arr.reduce((b,a)=>{const d=(a.p[0]-p[0])**2+(a.p[1]-p[1])**2;return d<b.d?{a,d}:b},{a:null,d:1e18}).a;

/* ---------- variables que modifica quien usa el simulador ---------- */
const V={huertas:{n:'Huertas activas',min:0,max:160,v:20,u:''},local:{n:'Acuerdos de compra local',min:0,max:100,v:5,u:' %'},recic:{n:'Recicladores organizados',min:0,max:80,v:10,u:''},
 cesion:{n:'Área que Corabastos cede al humedal',min:0,max:30,v:0,u:' %'},rot:{n:'Rotación de vocerías cada',min:2,max:52,v:52,u:' sem'},dist:{n:'Capacidad del distrito (hongos)',min:0,max:100,v:0,u:' %'},resp:{n:'Respuesta de la central (baja precios)',min:0,max:100,v:0,u:' %'}};
const SC={hoy:{t:'Hoy',d:'La central abastece casi todo; pocas huertas, sin distrito, sin rotación.',v:{huertas:20,local:5,recic:10,cesion:0,rot:52,dist:0,resp:0},luz:false,backup:true},
 prop:{t:'Propuesta',d:'Huertas, acopios, distrito de hongos, recicladores cogestores, rotación cada 8 semanas y 20 % cedido al humedal.',v:{huertas:140,local:60,recic:45,cesion:20,rot:8,dist:60,resp:0},luz:false,backup:true},
 desg:{t:'Sin rotación',d:'La propuesta, pero las vocerías no rotan: el trabajo recae en pocas personas y la participación cae.',v:{huertas:140,local:60,recic:45,cesion:20,rot:52,dist:60,resp:0},luz:false,backup:true},
 cent:{t:'La central responde',d:'Corabastos baja precios cuando pierde compra: los acuerdos locales se debilitan.',v:{huertas:140,local:60,recic:45,cesion:20,rot:8,dist:60,resp:60},luz:false,backup:true},
 luz:{t:'Se va la luz',d:'Corte de energía sin respaldo: el distrito para y se pierde parte de los hongos.',v:{huertas:140,local:60,recic:45,cesion:20,rot:8,dist:60,resp:0},luz:true,backup:false}};
$('#sliders').innerHTML=Object.entries(V).map(([k,o])=>`<div class="sl"><label>${o.n} <b id="v_${k}"></b></label><input type="range" id="s_${k}" min="${o.min}" max="${o.max}" value="${o.v}"></div>`).join('');
Object.keys(V).forEach(k=>{const s=$('#s_'+k);s.oninput=()=>{V[k].v=+s.value;$('#v_'+k).textContent=s.value+V[k].u};s.oninput()});
let scen='hoy';
$('#scen').innerHTML=Object.entries(SC).map(([k,o])=>`<button class="b" data-s="${k}">${o.t}</button>`).join('');
function setScen(k){scen=k;const o=SC[k];Object.entries(o.v).forEach(([q,v])=>{$('#s_'+q).value=v;$('#s_'+q).oninput()});$('#luz').checked=o.luz;$('#backup').checked=o.backup;
 document.querySelectorAll('#scen .b').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===k));$('#scenNote').textContent=o.d;reset()}
document.querySelectorAll('#scen .b').forEach(b=>b.onclick=()=>setScen(b.dataset.s));

/* ---------- estado y agentes ---------- */
let S,agents,hist,day,tick;
const TYPES={camion:{n:'Camión de Corabastos',c:'#E0623F'},bici:{n:'Hortelano o repartidor en bicicleta',c:'#8EBF4C'},reci:{n:'Reciclador cogestor',c:'#C9A15A'},ave:{n:'Ave del humedal',c:'#6FB7E0'},poli:{n:'Polinizador',c:'#F2D36B'}};
function reset(){S={dep:1,trips:0,res:0,cont:20,hab:.3,part:.8,fat:0,local:0,prod:0,hongos:0,birds:0};agents=[];hist={dep:[],trips:[],res:[],birds:[],part:[]};day=0;tick=0;ACOP.forEach(a=>a.stock=0);HUERTAS.forEach(h=>{h.yield=0;h.poll=0});follow=null}
const spawn=(type,p,o={})=>{const a={type,x:p[0],y:p[1],vx:0,vy:0,id:Math.random().toString(36).slice(2,7),...o};agents.push(a);return a};
const moveTo=(a,t,sp)=>{const dx=t[0]-a.x,dy=t[1]-a.y,d=Math.hypot(dx,dy);if(d<sp){a.x=t[0];a.y=t[1];return true}a.vx=dx/d*sp;a.vy=dy/d*sp;a.x+=a.vx;a.y+=a.vy;return false};

/* ---------- reglas diarias (dinámica agregada) ---------- */
function dayStep(){day++;
 const act=Math.round(V.huertas.v*S.part);const comp=V.recic.v>0?1.15:1;
 // producción local: huertas (polinizadores y compost) + hongos del distrito
 let prod=0;HUERTAS.forEach((h,i)=>{if(i<act){h.yield=0.34*(1+Math.min(1,h.poll/6)*.5)*comp;prod+=h.yield;h.poll*=.6}else h.yield=0});
 const energy=!($('#luz').checked&&!$('#backup').checked);
 const sust=Math.min(V.recic.v*0.6,40);S.hongos=energy?(V.dist.v/100)*Math.min(36,sust*0.8):0;if(!energy)ACOP.forEach(a=>a.stock*=.85);
 prod+=S.hongos;S.prod=prod;ACOP.forEach(a=>a.stock+=prod/ACOP.length);
 const demand=DEMAND.reduce((s,d)=>s+d.dem,0);
 // la central responde: si crece la compra local, baja precios y se debilitan los acuerdos
 const localEff=(V.local.v/100)*(1-(V.resp.v/100)*Math.min(1,S.local*1.6));
 const stock=ACOP.reduce((s,a)=>s+a.stock,0);const local=Math.min(stock,demand*localEff);
 ACOP.forEach(a=>a.stock=Math.max(0,a.stock-local/ACOP.length));
 S.local=local/demand;S.dep=1-S.local;S.trips=Math.ceil(demand*S.dep/12);
 // residuos: los genera el consumo y la central; los recuperan los recicladores
 const gen=demand*0.18+30*(1-V.cesion.v/100);const rec=Math.min(gen,V.recic.v*1.2);S.res=Math.max(0,S.res*0.85+gen-rec);
 // contaminación del humedal y calidad de hábitat
 S.cont=Math.max(0,Math.min(100,S.cont*0.97+(gen-rec)*0.05));S.hab=Math.max(0.05,Math.min(1,(0.3+V.cesion.v/100*2.2)*(1-S.cont/140)));
 // organización: sin rotación sube el desgaste y baja la participación (bucle de desgaste)
 const load=V.huertas.v/160+V.dist.v/200;S.fat=Math.max(0,Math.min(1,S.fat+load*(V.rot.v/52)*0.06-0.03));S.part=Math.max(0.2,Math.min(1,S.part+0.02*(S.local>0.2?1:0)-0.06*S.fat));
 ['dep','trips','res','part'].forEach(k=>{hist[k].push(S[k]);if(hist[k].length>90)hist[k].shift()});hist.birds.push(agents.filter(a=>a.type==='ave').length);if(hist.birds.length>90)hist.birds.shift();
 dispatch();}
function dispatch(){
 const cap=60;const count=t=>agents.filter(a=>a.type===t).length;
 // camiones según la dependencia
 for(let i=0;i<Math.min(S.trips,22)&&count('camion')<cap;i++){const d=DEMAND[Math.floor(rnd()*DEMAND.length)];spawn('camion',CORA,{to:d.p,dest:d.n||d.kind,stage:'va',carga:'Alimentos de fuera'})}
 // bicicletas: de huertas activas al acopio y del acopio a comedores y barrios
 const act=Math.round(V.huertas.v*S.part);for(let i=0;i<Math.min(act/8,14)&&count('bici')<cap;i++){const h=HUERTAS[Math.floor(rnd()*Math.max(1,act))];if(!h)break;const ac=near(ACOP,h.p);const d=near(rnd()<.5?COMED:BARRIOS,ac.p);spawn('bici',h.p,{to:ac.p,next:d.p,dest:'Acopio barrial',stage:'va',carga:'Cosecha de huerta'})}
 if(S.hongos>0)for(let i=0;i<Math.min(S.hongos/4,5);i++){const ac=ACOP[Math.floor(rnd()*ACOP.length)];spawn('bici',DIST,{to:ac.p,next:near(COMED,ac.p).p,dest:'Acopio barrial',stage:'va',carga:'Proteína de hongos'})}
 // recicladores: de los barrios al compostaje o al distrito
 for(let i=0;i<Math.min(V.recic.v/5,12)&&count('reci')<cap;i++){const b=BARRIOS[Math.floor(rnd()*BARRIOS.length)];const toD=V.dist.v>0&&rnd()<.5;spawn('reci',b.p,{to:toD?DIST:near(ACOP,b.p).p,dest:toD?'Distrito (sustratos)':'Compostaje junto al acopio',stage:'va',carga:'Residuos orgánicos'})}
}
/* ---------- comportamiento por cuadro ---------- */
function frameStep(){tick++;
 const dayLen=200;if(tick%dayLen===0)dayStep();
 // aves: bandada (separación, alineación, cohesión) atraída por los humedales según calidad de hábitat
 const target=Math.round(12+110*S.hab);const birds=agents.filter(a=>a.type==='ave');
 if(birds.length<target&&tick%6===0){const h=HUM[Math.floor(rnd()*HUM.length)];spawn('ave',[h.p[0]+(rnd()-.5)*300,h.p[1]+(rnd()-.5)*300],{home:h,vx:rnd()-.5,vy:rnd()-.5})}
 if(birds.length>target&&tick%6===0){const b=birds[0];agents.splice(agents.indexOf(b),1)}
 birds.forEach(b=>{let sx=0,sy=0,ax=0,ay=0,cx=0,cy=0,n=0;birds.forEach(o=>{if(o===b)return;const dx=o.x-b.x,dy=o.y-b.y,d=Math.hypot(dx,dy);if(d<160){n++;ax+=o.vx;ay+=o.vy;cx+=o.x;cy+=o.y;if(d<40){sx-=dx/d;sy-=dy/d}}});
  let fx=sx*0.6,fy=sy*0.6;if(n){fx+=(ax/n-b.vx)*0.05+((cx/n)-b.x)*0.0008;fy+=(ay/n-b.vy)*0.05+((cy/n)-b.y)*0.0008}
  const hr=b.home.r0*(b.home.n.includes('Vaca')?1+V.cesion.v/100*4:1);const dx=b.home.p[0]-b.x,dy=b.home.p[1]-b.y,dd=Math.hypot(dx,dy);if(dd>hr)fx+=dx/dd*.12,fy+=dy/dd*.12;
  const cd=Math.hypot(b.x-CORA[0],b.y-CORA[1]);if(cd<600){fx+=(b.x-CORA[0])/cd*.15;fy+=(b.y-CORA[1])/cd*.15}
  b.vx=(b.vx+fx)*.96;b.vy=(b.vy+fy)*.96;const sp=Math.hypot(b.vx,b.vy)||1;const ms=6;if(sp>ms){b.vx*=ms/sp;b.vy*=ms/sp}b.x+=b.vx;b.y+=b.vy});
 // polinizadores: van de huerta activa en huerta activa cercana y mejoran la cosecha
 const act=Math.round(V.huertas.v*S.part);const polis=agents.filter(a=>a.type==='poli');const pt=Math.min(60,Math.round(act*.35));
 if(polis.length<pt&&tick%4===0&&act>0){const h=HUERTAS[Math.floor(rnd()*act)];spawn('poli',h.p,{h})}
 if(polis.length>pt&&polis.length){agents.splice(agents.indexOf(polis[0]),1)}
 polis.forEach(p=>{if(!p.t||moveTo(p,p.t.p,3)){if(p.t)p.t.poll++;const c=HUERTAS.slice(0,Math.max(1,act)).filter(h=>Math.hypot(h.p[0]-p.x,h.p[1]-p.y)<900);p.t=c[Math.floor(rnd()*c.length)]||p.h;p.dest='Huerta '+(p.t.i+1)}});
 // camiones, bicicletas y recicladores
 agents.filter(a=>a.type==='camion'||a.type==='bici'||a.type==='reci').forEach(a=>{const sp=a.type==='camion'?9:a.type==='bici'?6:4;
  if(moveTo(a,a.to,sp)){if(a.type==='camion'&&a.stage==='va'){a.stage='vuelve';a.to=CORA;a.carga='Vacío';a.dest='Corabastos'}
   else if(a.type==='bici'&&a.stage==='va'&&a.next){a.stage='reparte';a.to=a.next;a.dest='Comedor o barrio';a.carga=a.carga+' para repartir'}
   else a.dead=true}});
 agents=agents.filter(a=>!a.dead||a===follow);if(follow&&follow.dead){follow=null}
}
/* ---------- dibujo y cámara ---------- */
const cv=$('#cv'),ctx=cv.getContext('2d');let cam={x:0,y:0,k:1},camT=null,follow=null,ftype=0;
const ext=[d3.extent(ring,p=>p[0]),d3.extent(ring,p=>p[1])];
function fit(){const r=cv.getBoundingClientRect();cv.width=r.width*devicePixelRatio;cv.height=r.height*devicePixelRatio;const k=Math.min(r.width/(ext[0][1]-ext[0][0]),r.height/(ext[1][1]-ext[1][0]))*.92;return{x:(ext[0][0]+ext[0][1])/2,y:(ext[1][0]+ext[1][1])/2,k}}
let home=fit();cam={...home};addEventListener('resize',()=>{home=fit();if(!follow)camT={...home}});
function draw(){const r=cv.getBoundingClientRect(),dpr=devicePixelRatio;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
 const tgt=follow?{x:follow.x,y:follow.y,k:home.k*7}:(camT||home);const e=reduce?1:.08;cam.x+=(tgt.x-cam.x)*e;cam.y+=(tgt.y-cam.y)*e;cam.k+=(tgt.k-cam.k)*e;
 const T=p=>[(p[0]-cam.x)*cam.k+r.width/2,(p[1]-cam.y)*cam.k+r.height/2];
 ctx.beginPath();ring.forEach((p,i)=>{const q=T(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fillStyle='#151a24';ctx.fill();ctx.strokeStyle='#4a5266';ctx.lineWidth=1.2;ctx.stroke();
 // humedales (La Vaca crece con el área cedida)
 HUM.forEach(h=>{const q=T(h.p);const rr=h.r0*(h.n.includes('Vaca')?1+V.cesion.v/100*4:1)*cam.k;ctx.beginPath();ctx.arc(q[0],q[1],Math.max(3,rr),0,7);ctx.fillStyle=`rgba(80,160,210,${.25+.45*S.hab})`;ctx.fill();ctx.strokeStyle='#6FB7E0';ctx.stroke()});
 // Corabastos (se reduce con la cesión)
 {const q=T(CORA);const s=Math.max(6,520*(1-V.cesion.v/100)*cam.k);ctx.fillStyle='rgba(222,159,80,.35)';ctx.strokeStyle='#DE9F50';ctx.lineWidth=1.5;ctx.fillRect(q[0]-s/2,q[1]-s/2*.8,s,s*.8);ctx.strokeRect(q[0]-s/2,q[1]-s/2*.8,s,s*.8)}
 const act=Math.round(V.huertas.v*S.part);
 HUERTAS.forEach((h,i)=>{const q=T(h.p);ctx.fillStyle=i<act?'#8EBF4C':'#3a4150';ctx.beginPath();ctx.arc(q[0],q[1],i<act?2.6:1.6,0,7);ctx.fill()});
 BARRIOS.forEach(b=>{const q=T(b.p);ctx.fillStyle='#5b6378';ctx.fillRect(q[0]-1.2,q[1]-1.2,2.4,2.4)});
 COLE.forEach(c=>{const q=T(c.p);ctx.fillStyle='#F2B53A';ctx.fillRect(q[0]-2,q[1]-2,4,4)});
 COMED.forEach(c=>{const q=T(c.p);ctx.fillStyle='#CF7ABB';ctx.beginPath();ctx.arc(q[0],q[1],4,0,7);ctx.fill()});
 if(V.huertas.v>30||V.local.v>20)ACOP.forEach(a=>{const q=T(a.p);ctx.save();ctx.translate(...q);ctx.rotate(Math.PI/4);ctx.fillStyle='#F2B53A';ctx.fillRect(-6,-6,12,12);ctx.restore()});
 if(V.dist.v>0){const q=T(DIST);ctx.fillStyle=S.hongos>0?'#A08CF0':'#4a4466';ctx.beginPath();ctx.arc(q[0],q[1],8,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.stroke()}
 agents.forEach(a=>{const q=T([a.x,a.y]);const c=TYPES[a.type].c;ctx.fillStyle=c;
  if(a.type==='camion'){ctx.save();ctx.translate(...q);ctx.rotate(Math.atan2(a.vy,a.vx));ctx.fillRect(-5,-3,10,6);ctx.restore()}
  else if(a.type==='ave'){ctx.save();ctx.translate(...q);ctx.rotate(Math.atan2(a.vy,a.vx));ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-4,3.5);ctx.lineTo(-2,0);ctx.lineTo(-4,-3.5);ctx.closePath();ctx.fill();ctx.restore()}
  else{ctx.beginPath();ctx.arc(q[0],q[1],a.type==='poli'?1.8:3.2,0,7);ctx.fill()}
  if(a===follow){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q[0],q[1],14,0,7);ctx.stroke()}});
 if(follow){$('#follow').innerHTML=`<b style="color:${TYPES[follow.type].c}">${TYPES[follow.type].n}</b><br>Destino: ${follow.dest||'humedal'}<br>${follow.carga?'Lleva: '+follow.carga+'<br>':''}Agente ${follow.id}`}
}
/* ---------- resultados ---------- */
function spark(arr,col,max){const w=260,h=42;if(!arr.length)return'';const m=max||Math.max(...arr,1);const p=arr.map((v,i)=>`${(i/(Math.max(1,arr.length-1)))*w},${h-2-(v/m)*(h-6)}`).join(' ');return`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${p}" fill="none" stroke="${col}" stroke-width="2"/></svg>`}
function kpis(){const K=[['Dependencia de Corabastos',Math.round(S.dep*100)+' %',hist.dep,'#E0623F',1],['Viajes de camión por día',S.trips,hist.trips,'#E0623F'],['Residuos sin recuperar',Math.round(S.res),hist.res,'#C9A15A'],['Aves en los humedales',agents.filter(a=>a.type==='ave').length,hist.birds,'#6FB7E0'],['Participación en la organización',Math.round(S.part*100)+' %',hist.part,'#8EBF4C',1]];
 $('#kpis').innerHTML=`<div class="note" style="margin-bottom:6px">Día ${day}</div>`+K.map(([t,v,h,c,m])=>`<div class="card kp"><b>${v}</b><span>${t}</span>${spark(h,c,m)}</div>`).join('')}
$('#leg').innerHTML=Object.values(TYPES).map(t=>`<div><i style="background:${t.c}"></i>${t.n} (agente activo)</div>`).join('')+['#8EBF4C Huerta activa (agente pasivo)','#3a4150 Huerta inactiva','#CF7ABB Comedor comunitario','#F2B53A Colegio oficial · acopio barrial (rombo)','#A08CF0 Distrito de hongos','#DE9F50 Corabastos','#6FB7E0 Humedal (entorno)'].map(s=>{const [c,...t]=s.split(' ');return`<div><i style="background:${c}"></i>${t.join(' ')}</div>`}).join('');
/* ---------- controles ---------- */
let playing=true,speed=2;$('#play').onclick=()=>{playing=!playing;$('#play').textContent=playing?'Pausar':'Seguir';$('#play').setAttribute('aria-pressed',playing)};
$('#reset').onclick=()=>reset();$('#spd').oninput=e=>{speed=+e.target.value;$('#spdv').textContent=speed+'×'};$('#spd').oninput({target:$('#spd')});
const TK=Object.keys(TYPES);$('#fType').onclick=()=>{ftype=(ftype+1)%TK.length;$('#fType').textContent='Tipo: '+TYPES[TK[ftype]].n.split(' ')[0];pickFollow()};
function pickFollow(){const list=agents.filter(a=>a.type===TK[ftype]);if(!list.length){$('#follow').textContent='No hay agentes de este tipo en este escenario.';follow=null;return}const i=follow?(list.indexOf(follow)+1)%list.length:0;follow=list[i]}
$('#fNext').onclick=pickFollow;$('#fOut').onclick=()=>{follow=null;camT={...home};$('#follow').textContent='Vista general del territorio.'};
cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect();const mx=(e.clientX-r.left-r.width/2)/cam.k+cam.x,my=(e.clientY-r.top-r.height/2)/cam.k+cam.y;let b=null,bd=(20/cam.k)**2;agents.forEach(a=>{const d=(a.x-mx)**2+(a.y-my)**2;if(d<bd){bd=d;b=a}});if(b){follow=b;ftype=TK.indexOf(b.type)}});
setScen('hoy');
(function loop(){if(playing)for(let i=0;i<speed;i++)frameStep();draw();if(tick%10===0)kpis();requestAnimationFrame(loop)})();
window.__sim={get S(){return S},setScen,get agents(){return agents}};
})();
