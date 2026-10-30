(async function(){
const D=await fetch('data.json').then(r=>r.json());
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const mobile=()=>matchMedia('(max-width:900px)').matches;

const TN={problema:{n:'Problemas (Corte II)',c:'#E0623F'},lugar:{n:'Lugares y hábitats',c:'#6FCF97'},infraestructura:{n:'Infraestructuras',c:'#4EAECF'},norma:{n:'Normas y condicionantes',c:'#9AA3B5'},condicion:{n:'Condiciones y presiones',c:'#F0A35E'},actor:{n:'Actores y organizaciones',c:'#B3A6EE'},propuesta:{n:'Propuesta del grupo',c:'#F2B53A'},especie:{n:'Especies',c:'#8EBF4C'}};
const PG={1:'#DE9F50',2:'#8EBF4C',3:'#4EAECF'};
const SPC={cor:'#DE9F50',log:'#4EAECF',con:'#DE7766',res:'#8EBF4C',gob:'#9382E0',edu:'#CF7ABB',sal:'#4EBF94',mov:'#BFB080'};
const TX={Flora:'#84A48B',Aves:'#7DA0B8','Mamíferos':'#D9A066','Artrópodos':'#A386A9',Anfibios:'#6B9080',Reptiles:'#C98A94'};
const EK={ecologica:{n:'Interacción ecológica',c:'#7FB77E'},flujo:{n:'Flujo material o económico',c:'#E5A54B'},espacial:{n:'Relación espacial',c:'#6C8CB5'},decision:{n:'Decisión y acción',c:'#A08CF0'},cooperacion:{n:'Cooperación',c:'#D8D3C7'},conflicto:{n:'Conflicto y presión',c:'#E0623F'},causal:{n:'Causa entre problemas',c:'#F07B5C'}};
const EV={documentada:{n:'Documentada con fuente',d:null,o:.75},'diagnóstico':{n:'Diagnóstico del grupo',d:null,o:.5},potencial:{n:'Potencial (por regla de afinidad)',d:'2 4',o:.28},'hipótesis':{n:'Hipótesis por verificar',d:'7 5',o:.6},propuesta:{n:'Propuesta del grupo',d:'7 5',o:.8}};
const COL=t=>({problema:0,lugar:1,infraestructura:1,norma:1,condicion:1,actor:2,propuesta:2,especie:3})[t];
const COLN=['Problemas','Lugares, hábitats e infraestructuras','Actores y propuesta','Especies'];
const fill=n=>n.tipo==='problema'?PG[n.grupo]||TN.problema.c:n.tipo==='actor'?(SPC[n.sph]||TN.actor.c):n.tipo==='especie'?(TX[n.taxon]||TN.especie.c):TN[n.tipo].c;
const rad=n=>n.tipo==='problema'?(['may','res','eco'].includes(n.id.slice(2))?13:8):n.tipo==='actor'?({1:9,2:7,3:5.5,4:5}[n.lv]||6):n.tipo==='propuesta'?11:n.tipo==='especie'?(n.grupo_especie?8:4):9;
const NET=n=>n.tipo==='problema'?'problemas':n.tipo==='especie'&&!n.capa?'biotica':(n.tipo==='actor'&&!n.capa)?'social':n.tipo==='propuesta'?'propuesta':'conectografia';

const nodes=D.nodes.map(n=>({...n}));const byId=new Map(nodes.map(n=>[n.id,n]));
const edges=D.edges.map((e,i)=>({...e,i,source:byId.get(e.s),target:byId.get(e.t)})).filter(e=>e.source&&e.target);
nodes.forEach(n=>{n.deg=0});edges.forEach(e=>{e.source.deg++;e.target.deg++});
const bridges=edges.filter(e=>NET(e.source)!==NET(e.target)).length;
$('#stats').innerHTML=[[nodes.length,'nodos'],[edges.length,'relaciones'],[bridges,'puentes entre redes'],[nodes.filter(n=>n.tipo==='especie'&&!n.capa).length,'especies'],[nodes.filter(n=>n.tipo==='problema').length,'problemas']].map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('');

const tipEl=$('#tip');const tip=(h,e)=>{tipEl.innerHTML=h;tipEl.style.display='block';tipEl.style.left=Math.min(e.clientX+14,innerWidth-310)+'px';tipEl.style.top=(e.clientY+14)+'px'};const untip=()=>tipEl.style.display='none';
/* ---------- disposición: cuatro columnas que se cruzan ---------- */
const svg=d3.select('#net');let W,H;
function layout(){const r=$('main').getBoundingClientRect();W=r.width;H=r.height;svg.attr('viewBox',`0 0 ${W} ${H}`);
 const P=mobile();const cx=c=>P?W/2:W*(.12+c*.255),cy=c=>P?H*(.1+c*.265):H*.52;
 nodes.forEach(n=>{const c=COL(n.tipo);n.x=cx(c)+(Math.random()-.5)*40;n.y=cy(c)+(Math.random()-.5)*40});
 const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(edges).strength(e=>COL(e.source.tipo)===COL(e.target.tipo)?.06:.008).distance(40))
  .force('q',d3.forceManyBody().strength(n=>n.tipo==='especie'?-14:-34)).force('x',d3.forceX(n=>cx(COL(n.tipo))).strength(P?.06:.32)).force('y',d3.forceY(n=>cy(COL(n.tipo))).strength(P?.32:.05))
  .force('c',d3.forceCollide(n=>rad(n)+2.5)).stop();
 for(let i=0;i<320;i++)sim.tick();
 return {cx,cy,P};
}
let L=layout();let cur={k:1};
const root=svg.append('g');const gH=root.append('g'),gE=root.append('g'),gN=root.append('g');
let LIT=null;const zoom=d3.zoom().scaleExtent([.4,8]).on('zoom',e=>{root.attr('transform',e.transform);labels(e.transform.k,LIT)});svg.call(zoom);
function headers(){gH.selectAll('*').remove();COLN.forEach((t,c)=>{const ns=nodes.filter(n=>COL(n.tipo)===c);if(!ns.length)return;const x=L.P?16:d3.mean(ns,n=>n.x),y=L.P?d3.min(ns,n=>n.y)-18:d3.min(ns,n=>n.y)-22;
 gH.append('text').attr('class','colh').attr('x',x).attr('y',y).attr('text-anchor',L.P?'start':'middle').text(t)})}
const path=e=>{const dx=e.target.x-e.source.x,dy=e.target.y-e.source.y;const k=COL(e.source.tipo)===COL(e.target.tipo)?.18:.08;return`M${e.source.x},${e.source.y}Q${(e.source.x+e.target.x)/2-dy*k},${(e.source.y+e.target.y)/2+dx*k} ${e.target.x},${e.target.y}`};
const es=gE.selectAll('path').data(edges).join('path').attr('class','edge').attr('d',path).attr('stroke',e=>e.ev==='propuesta'?'#F2B53A':EK[e.k].c)
 .attr('stroke-width',e=>e.k==='ecologica'?.7:e.ev==='propuesta'?1.8:1.2).attr('stroke-dasharray',e=>EV[e.ev].d).attr('opacity',e=>EV[e.ev].o)
 .on('mousemove',(ev,e)=>tip(`<b>${esc(e.source.short||e.source.name)} → ${esc(e.target.short||e.target.name)}</b><br>${EK[e.k].n}: ${esc(e.sub)}<br><span style="color:#8b93a6">${EV[e.ev].n} · ${esc(e.src)}</span>`,ev)).on('mouseleave',untip);
const shape=(g,n)=>{const r=rad(n),c=fill(n);
 if(n.tipo==='problema')g.append('rect').attr('x',-r*1.25).attr('y',-r*.85).attr('width',r*2.5).attr('height',r*1.7).attr('rx',3).attr('fill',c).attr('stroke','#0b0d12');
 else if(n.tipo==='lugar'){const p=d3.range(6).map(i=>[r*1.15*Math.cos(Math.PI/3*i),r*1.15*Math.sin(Math.PI/3*i)]);g.append('path').attr('d','M'+p.join('L')+'Z').attr('fill',c).attr('stroke','#0b0d12')}
 else if(n.tipo==='infraestructura')g.append('rect').attr('x',-r).attr('y',-r).attr('width',r*2).attr('height',r*2).attr('fill',c).attr('stroke','#0b0d12');
 else if(n.tipo==='norma')g.append('path').attr('d',`M0,${-r*1.2}L${r*1.2},0L0,${r*1.2}L${-r*1.2},0Z`).attr('fill',c).attr('stroke','#0b0d12');
 else if(n.tipo==='condicion')g.append('path').attr('d',`M0,${-r*1.2}L${r*1.1},${r*.8}L${-r*1.1},${r*.8}Z`).attr('fill',c).attr('stroke','#0b0d12');
 else if(n.tipo==='propuesta'){g.append('circle').attr('r',r).attr('fill','#1d1a12').attr('stroke',c).attr('stroke-width',2.2).attr('stroke-dasharray','4 3');g.append('circle').attr('r',r*.35).attr('fill',c)}
 else g.append('circle').attr('r',r).attr('fill',c).attr('stroke',n.grupo_especie?'#fff':'#0b0d12').attr('stroke-width',n.grupo_especie?1.4:1)};
const ns=gN.selectAll('g').data(nodes).join('g').attr('class','node').attr('transform',n=>`translate(${n.x},${n.y})`).each(function(n){shape(d3.select(this),n)});
ns.append('text').attr('text-anchor','middle').attr('y',n=>rad(n)+12).text(n=>n.short||n.name);
ns.on('mousemove',(ev,n)=>{if(!focus)hl(new Set([n.id,...nb(n.id)]));tip(`<b>${esc(n.name)}</b><br>${TN[n.tipo].n}${n.taxon?' · '+n.taxon:''}`,ev)})
  .on('mouseleave',()=>{untip();if(!focus)hl(null)}).on('click',(ev,n)=>{ev.stopPropagation();select(n)});
svg.on('click',()=>{focus=null;$('#prob').value='';hl(null);info()});
headers();
const adj=new Map(nodes.map(n=>[n.id,[]]));edges.forEach(e=>{adj.get(e.s).push(e);adj.get(e.t).push(e)});
const nb=id=>adj.get(id).filter(vis).map(e=>e.s===id?e.t:e.s);
let focus=null;
/* ---------- filtros ---------- */
const F={t:new Set(Object.keys(TN)),k:new Set(Object.keys(EK)),v:new Set(Object.keys(EV))};
const vis=e=>F.k.has(e.k)&&F.v.has(e.ev)&&F.t.has(e.source.tipo)&&F.t.has(e.target.tipo);
function apply(){ns.style('display',n=>F.t.has(n.tipo)?null:'none');es.style('display',e=>vis(e)?null:'none')}
const sw={node:t=>`<svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="${TN[t].c}"/></svg>`,edge:k=>`<svg width="24" height="10"><path d="M1 5H23" stroke="${EK[k].c}" stroke-width="2.4"/></svg>`,ev:v=>`<svg width="24" height="10"><path d="M1 5H23" stroke="#cfd3dc" stroke-width="2" ${EV[v].d?`stroke-dasharray="${EV[v].d}"`:''}/></svg>`};
function togs(el,obj,set,kind,count){$(el).innerHTML=Object.entries(obj).map(([k,v])=>`<button class="tog" data-k="${k}" aria-pressed="true">${sw[kind](k)}${v.n}<b>${count(k)}</b></button>`).join('');
 $(el).querySelectorAll('.tog').forEach(b=>b.onclick=()=>{const k=b.dataset.k;set.has(k)?set.delete(k):set.add(k);b.setAttribute('aria-pressed',set.has(k));apply();if(focus)runFocus()})}
togs('#tNodes',TN,F.t,'node',k=>nodes.filter(n=>n.tipo===k).length);togs('#tEdges',EK,F.k,'edge',k=>edges.filter(e=>e.k===k).length);togs('#tEv',EV,F.v,'ev',k=>edges.filter(e=>e.ev===k).length);
/* ---------- resaltar y recorrer ---------- */
function hl(set,eset){LIT=set||null;if(!set){svg.classed('dim',false);ns.classed('on',false);es.classed('on',false);labels(cur.k);return}
 svg.classed('dim',true);ns.classed('on',n=>set.has(n.id));es.classed('on',e=>eset?eset.has(e.i):(set.has(e.s)&&set.has(e.t)&&vis(e)));labels(cur.k,set)}
function labels(k,set){k=k||1;cur={k};const fs=(mobile()?11:12)/Math.min(k,1.6)*(k>1?1:1);const want=n=>{if(set)return set.has(n.id);if(n.tipo==='especie')return k>2.6;if(n.tipo==='actor')return n.lv<=1||k>1.8;if(n.tipo==='problema')return rad(n)>10||k>1.4;return k>1.1||n.tipo==='propuesta'};
 const order=nodes.filter(n=>F.t.has(n.tipo)&&want(n)).sort((a,b)=>rad(b)-rad(a));const ok=new Map();const placed=(set?nodes.filter(n=>set.has(n.id)):order).map(n=>{const r=rad(n)+1;return[n.x-r,n.y-r,n.x+r,n.y+r]});
 order.forEach(n=>{const w=(n.short||n.name).length*fs*.56,h=fs*1.2,r=rad(n);const C=[[n.x-w/2,n.y+r+2,'middle',r+fs],[n.x-w/2,n.y-r-2-h,'middle',-r-4],[n.x+r+3,n.y-h/2,'start',fs*.35],[n.x-r-3-w,n.y-h/2,'end',fs*.35]];
  for(const [x,y,a,dy] of C){const b=[x,y,x+w,y+h];if(!placed.some(p=>b[0]<p[2]&&b[2]>p[0]&&b[1]<p[3]&&b[3]>p[1])){placed.push(b);ok.set(n.id,[a,dy,a==='start'?r+3:a==='end'?-r-3:0]);break}}});
 ns.select('text').style('display',n=>ok.has(n.id)?null:'none').attr('font-size',fs+'px').each(function(n){const o=ok.get(n.id);if(!o)return;d3.select(this).attr('text-anchor',o[0]).attr('x',o[2]).attr('y',o[1])})}
labels(1);
function fitTo(list,maxK=3.2){if(!list.length)return;const x0=d3.min(list,n=>n.x)-60,x1=d3.max(list,n=>n.x)+60,y0=d3.min(list,n=>n.y)-40,y1=d3.max(list,n=>n.y)+40;
 const k=Math.min(maxK,.92*Math.min(W/(x1-x0),H/(y1-y0)));svg.transition().duration(reduce?0:900).call(zoom.transform,d3.zoomIdentity.translate(W/2-k*(x0+x1)/2,H/2-k*(y0+y1)/2).scale(k))}
function select(n){focus={type:'node',id:n.id};runFocus();info(n)}
function runFocus(){if(!focus)return;let set,eset=new Set();
 if(focus.type==='node'){set=new Set([focus.id,...nb(focus.id)]);adj.get(focus.id).filter(vis).forEach(e=>eset.add(e.i))}
 else{set=new Set([focus.id]);const add=(e,o)=>{eset.add(e.i);set.add(o)};
  const L1=[];adj.get(focus.id).filter(vis).forEach(e=>{const o=e.s===focus.id?e.t:e.s;add(e,o);L1.push(o)});
  L1.forEach(id=>{const t=byId.get(id).tipo;adj.get(id).filter(vis).forEach(e=>{const o=e.s===id?e.t:e.s;const ot=byId.get(o).tipo;
   if((t==='lugar'||t==='infraestructura'||t==='condicion'||t==='norma')&&(ot==='especie'||ot==='actor'||ot==='propuesta'))add(e,o);
   else if(t==='actor'&&(ot==='lugar'||ot==='propuesta'))add(e,o);
   else if(t==='propuesta'&&ot==='actor')add(e,o)})})}
 hl(set,eset);fitTo(nodes.filter(n=>set.has(n.id)),mobile()?2.4:3.2);if(focus.type==='prob')info(byId.get(focus.id),set)}
const probs=nodes.filter(n=>n.tipo==='problema').sort((a,b)=>a.grupo-b.grupo||(rad(b)-rad(a)));
$('#prob').innerHTML='<option value="">Toda la red</option>'+[1,2,3].map(g=>`<optgroup label="${esc(probs.find(p=>p.grupo===g)?.gname||'')}">`+probs.filter(p=>p.grupo===g).map(p=>`<option value="${p.id}">${esc(p.short)}</option>`).join('')+'</optgroup>').join('');
$('#prob').onchange=e=>{const v=e.target.value;if(!v){focus=null;hl(null);fitTo(nodes,1);info();return}focus={type:'prob',id:v};runFocus()};
/* ---------- panel de información ---------- */
function info(n,set){const I=$('#info');
 if(!n){const c=t=>nodes.filter(x=>x.tipo===t).length;
  I.innerHTML=`<div class="card"><div class="t" style="color:var(--ochre)">Cómo leer la red</div><h3>Tres redes en una</h3><p>Une la red de interacciones bióticas, la conectografía del POT de Kennedy y la red política de organización social, más los problemas del segundo corte y la propuesta del grupo.</p><p>Las columnas van de los problemas a sus lugares, a los actores que los producen, soportan o gestionan, y a las especies que habitan esos lugares. Las líneas que cruzan columnas son los puentes entre redes.</p></div>
  <div class="card"><div class="t" style="color:var(--ochre)">Escala y ubicación</div><p>Problemas y lugares: localidad de Kennedy (Corte II). Actores: escala barrial, local y distrital. Especies: registros georreferenciados en Kennedy (iNaturalist) y censo de arbolado SIGAU.</p></div>
  <div class="card"><div class="t" style="color:#E0623F">Rigor de las interacciones bióticas</div><p>Las ${edges.filter(e=>e.k==='ecologica').length} interacciones entre especies se marcan como potenciales: vienen de reglas de afinidad de la red biótica. Que dos especies estén registradas en Kennedy no demuestra que interactúen allí; cada una requiere verificación.</p><p>Las ${edges.filter(e=>e.sub==='registrada en el hábitat').length} relaciones especie–hábitat sí son registros documentados con su fuente.</p></div>`;return}
 const rel=adj.get(n.id).filter(vis);const grp=d3.group(rel,e=>e.k);
 const head=`<div class="card"><div class="t" style="color:${fill(n)}">${TN[n.tipo].n}${n.taxon?' · '+n.taxon:''}</div><h3>${esc(n.name)}</h3>
  ${n.sci?`<p>${esc(n.sci)}</p>`:''}${n.img&&/^http/.test(n.img)?`<img src="${esc(n.img)}" alt="${esc(n.name)}">`:''}
  ${n.gname?`<p>Grupo: ${esc(n.gname)}</p>`:''}${n.loc?`<p>Ubicación: ${esc(n.loc)}</p>`:''}${n.lugar?`<p>Registro: ${esc(n.presencia)} · ${esc(n.lugar)}${n.fecha?' · '+esc(n.fecha):''}</p>`:''}
  ${n.fun?`<p>${esc(n.fun)}</p>`:''}${n.rol?`<p>${esc(n.rol)}</p>`:''}${n.tension?`<p style="color:#F0A35E">${esc(n.tension)}</p>`:''}
  <p style="color:var(--mute);font-size:11.5px">Fuente: ${esc(n.fuente||'')}</p></div>`;
 const lit=set?`<div class="card"><div class="t" style="color:var(--ochre)">Recorrido del problema</div><p>${[...set].length} nodos conectados: ${['problema','lugar','infraestructura','actor','propuesta','especie'].map(t=>`${[...set].filter(id=>byId.get(id).tipo===t).length} ${TN[t].n.toLowerCase()}`).join(' · ')}.</p></div>`:'';
 I.innerHTML=head+lit+[...grp].map(([k,list])=>`<h2>${EK[k].n} · ${list.length}</h2>`+list.slice(0,40).map(e=>{const o=e.s===n.id?e.target:e.source;return`<div class="rel"><b>${e.s===n.id?'→':'←'} ${esc(o.short||o.name)}</b> · ${esc(e.sub)}<br><span class="pill" style="background:#1d2230;color:#cfd3dc">${EV[e.ev].n}</span>${e.m?esc(e.m).slice(0,180):''}</div>`}).join('')).join('');
}
info();apply();
$('#zin').onclick=()=>svg.transition().call(zoom.scaleBy,1.4);$('#zout').onclick=()=>svg.transition().call(zoom.scaleBy,1/1.4);$('#zfit').onclick=()=>fitTo(nodes,1);
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{L=layout();ns.attr('transform',n=>`translate(${n.x},${n.y})`);es.attr('d',path);headers()},300)});
// entrada animada
ns.style('opacity',0).transition().delay(n=>reduce?0:COL(n.tipo)*220+Math.random()*300).duration(500).style('opacity',1).on('end',function(){d3.select(this).style('opacity',null)});
es.style('opacity',0).transition().delay(reduce?0:1100).duration(800).style('opacity',null);
})();
