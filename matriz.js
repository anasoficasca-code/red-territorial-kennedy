(async function(){
const M=await fetch('matriz.json').then(r=>r.json());
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const DC=['#DE9F50','#8EBF4C','#CF7ABB','#F2B53A','#7FB77E','#4EAECF','#A08CF0','#E0623F','#BFB080','#4EBF94'];
const dcol=id=>DC[(parseInt(id.slice(1))-1)%DC.length];
const rows=M.rows;
const chips=s=>s.split(/,\s*|;\s*|\n/).map(x=>x.trim().replace(/\.$/,'')).filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
const BUC=[['refuerzo','Bucle de refuerzo','#8EBF4C'],['equilibrio','Bucle de equilibrio','#4EAECF'],['captura','Bucle de captura','#E0623F'],['desgaste','Bucle de desgaste','#F2B53A']];
const bucles=s=>BUC.filter(([k])=>new RegExp(k,'i').test(s)).map(([k,n,c])=>`<span class="bucle" style="background:${c}22;color:${c}">${n.replace('Bucle de ','')}</span>`).join('');

// problema
const p0=rows[0]?.prob||'';const [pid,...rest]=p0.split(' · ');
$('#prob').innerHTML=`<div class="id">${esc(pid.split(' ')[0])}</div><div><b style="font-size:18px">${esc(pid.replace(/^P\d+\s*·?\s*/,''))}</b><p>${esc(rest.join(' · '))}</p></div>`;

// dinámicas
let selD=null;
$('#dgrid').innerHTML=M.din.map(d=>{const rs=rows.filter(r=>r.d===d.id);const es=[...new Set(rs.map(r=>r.e))];
 return`<button class="dcard" data-d="${d.id}" style="--c:${dcol(d.id)}"><div class="id">${d.id}</div><h3>${esc(d.n)}</h3><div class="n">${rs.length} actividad${rs.length>1?'es':''} · espacios ${es.join(', ')}</div></button>`}).join('');
document.querySelectorAll('.dcard').forEach(b=>b.onclick=()=>{selD=selD===b.dataset.d?null:b.dataset.d;
 document.querySelectorAll('.dcard').forEach(x=>x.classList.toggle('on',x.dataset.d===selD));
 document.querySelectorAll('tr.row').forEach(t=>t.classList.toggle('off',!!selD&&t.dataset.d!==selD));
 hlSpaces(selD?new Set(rows.filter(r=>r.d===selD).map(r=>r.e)):null)});

// matriz (escritorio)
const eN=id=>M.esp.find(e=>e.id===id)?.n||id;
$('#tb').innerHTML=M.din.map(d=>`<tr class="dh" style="--c:${dcol(d.id)}"><td colspan="7"><span class="id">${d.id}</span>${esc(d.n)}</td></tr>`+
 rows.filter(r=>r.d===d.id).map(r=>`<tr class="row" data-d="${r.d}" id="${r.id}">
  <td><span class="ida">${r.id}</span>${esc(r.act)}</td><td>${chips(r.hum)}</td>
  <td>${r.nohum?chips(r.nohum):'<span style="color:var(--mute)">No aplica</span>'}${r.cond?`<span class="cond">Condiciones: ${esc(r.cond)}</span>`:''}</td>
  <td><span class="eid">${r.e}</span>${esc(r.esp)}${r.tiempo?`<div style="margin-top:6px;color:#cfd3dc">Tiempo: ${esc(r.tiempo)}</div>`:''}</td>
  <td>${esc(r.ady)}</td><td>${esc(r.acc)}</td><td>${esc(r.red)}<div>${bucles(r.red)}</div></td></tr>`).join('')).join('');
// matriz (celular)
$('#cards').innerHTML=rows.map(r=>`<div class="card" style="--c:${dcol(r.d)}"><span class="ida">${r.id} · ${r.d} · ${esc(r.din)}</span><h4>${esc(r.act)}</h4>
 <div class="f"><b>Actores humanos</b>${chips(r.hum)}</div><div class="f"><b>Actores no humanos</b>${r.nohum?chips(r.nohum):'No aplica'}${r.cond?`<span class="cond">Condiciones: ${esc(r.cond)}</span>`:''}</div>
 <div class="f"><b>Espacio y tiempo</b><span class="eid">${r.e}</span>${esc(r.esp)}${r.tiempo?'<br>Tiempo: '+esc(r.tiempo):''}</div>
 <div class="f"><b>Adyacencia</b>${esc(r.ady)}</div><div class="f"><b>Acceso</b>${esc(r.acc)}</div><div class="f"><b>Relación con red y modelo</b>${esc(r.red)}<div>${bucles(r.red)}</div></div></div>`).join('');

/* ---------- diagrama de adyacencia y acceso (leído de la matriz) ---------- */
const CTX={V:'Vivienda',VA:'Conjunto en altura',H:'Humedal',VIA:'Vía local o ciclorruta'};
const POS={E1:[1140,70],E2:[300,130],E3:[300,340],E4:[450,520],E5:[300,680],E10:[530,250],E7:[790,340],E8:[1000,190],E9:[1110,340],E11:[1110,500],E12:[930,600],E13:[1110,690],E6:[640,650],E14:[790,90],E15:[530,70],E16:[790,480],V:[90,130],VA:[90,340],H:[90,680],VIA:[968,70]};
const ADY=[['E2','V','junto'],['E2','E10','cerca'],['E3','VA','dentro'],['E3','E10','condicional','solo si el conjunto lo permite'],['E4','E10','junto'],['E4','E7','cerca'],['E5','H','junto'],['E5','E10','separado','por los líquidos que escurren'],
 ['E6','E7','junto'],['E7','E8','junto'],['E7','E9','cerca','dentro de la ruta corta de reparto'],['E7','VIA','cerca'],['E11','E9','junto'],['E11','E7','junto'],['E12','E7','junto'],['E12','E6','separado','por el control de esporas'],['E13','E12','junto'],['E14','E7','junto','o junto a una huerta'],['E15','E14','junto'],['E16','E7','dentro','o dentro del espacio de aprendizaje']];
const ACC=[['E1','E9','indirecto','rutas y vías del barrio, vehículos de terceros'],['E1','E6','indirecto','rutas y vías del barrio'],['E2','E7','indirecto','carreta o bicicleta'],['E3','E7','indirecto','depende del reglamento de propiedad horizontal'],['E4','E7','directo o indirecto','según el lote'],
 ['E5','E7','indirecto','humanos en horarios y senderos; la fauna conserva sus pasos'],['E7','E6','directo o indirecto',''],['E7','E8','directo',''],['E7','E9','indirecto','cargas pequeñas'],['E10','E2','directo o indirecto',''],['E10','E4','directo o indirecto',''],['E10','E5','sin acceso','sin acceso directo'],
 ['E11','E10','indirecto','rutas del barrio'],['E12','E7','directo','visitantes con acceso restringido'],['E12','E6','indirecto','pasando por el punto de acopio'],['E13','E7','directo','cadena de frío corta']];
const ATY={'directo':{c:'#7FD08A',d:null,n:'Acceso directo'},'directo o indirecto':{c:'#B8D46A',d:'9 4',n:'Directo o indirecto'},'indirecto':{c:'#F2B53A',d:'6 5',n:'Acceso indirecto'},'sin acceso':{c:'#E0623F',d:'2 4',n:'Sin acceso'}};
const DTY={junto:{c:'#E9E6DE',w:3,n:'Adyacente (junto a)'},cerca:{c:'#9AA3B5',w:1.6,n:'Cercano'},dentro:{c:'#B3A6EE',w:2,d:'1 4',n:'Contenido en'},condicional:{c:'#9AA3B5',w:1.6,d:'1 4',n:'Adyacencia condicionada'},separado:{c:'#E0623F',w:1.4,d:'4 4',n:'Separado a propósito'}};
const eDyn=id=>rows.find(r=>r.e===id)?.d;
$('#leg').innerHTML=Object.values(DTY).map(t=>`<span><svg width="30" height="10"><path d="M1 5H29" stroke="${t.c}" stroke-width="${t.w}" ${t.d?`stroke-dasharray="${t.d}"`:''}/></svg>${t.n}</span>`).join('')+Object.values(ATY).map(t=>`<span><svg width="34" height="10"><path d="M1 5H27" stroke="${t.c}" stroke-width="2" ${t.d?`stroke-dasharray="${t.d}"`:''}/><path d="M26 1L33 5L26 9z" fill="${t.c}"/></svg>${t.n}</span>`).join('');
const svg=d3.select('#sp').attr('viewBox','0 0 1245 750');
const df=svg.append('defs');Object.entries(ATY).forEach(([k,t],i)=>df.append('marker').attr('id','ma'+i).attr('viewBox','0 0 10 10').attr('refX',9).attr('refY',5).attr('markerWidth',9).attr('markerHeight',9).attr('orient','auto').attr('markerUnits','userSpaceOnUse').append('path').attr('d','M0 1L9 5L0 9z').attr('fill',t.c));
const gA=svg.append('g'),gB=svg.append('g'),gN=svg.append('g');
const NW=(id)=>CTX[id]?130:184,NH=(id)=>CTX[id]?40:62;
const clip=(a,b,id)=>{const [x,y]=POS[a],[tx,ty]=POS[b];const dx=tx-x,dy=ty-y;const s=Math.min((NW(a)/2+4)/Math.abs(dx||1e-6),(NH(a)/2+4)/Math.abs(dy||1e-6));return[x+dx*s,y+dy*s]};
const ady=gA.selectAll('path').data(ADY).join('path').attr('d',([a,b])=>{const p=clip(a,b),q=clip(b,a);return`M${p}L${q}`}).attr('stroke',d=>DTY[d[2]].c).attr('stroke-width',d=>DTY[d[2]].w).attr('stroke-dasharray',d=>DTY[d[2]].d||null).attr('fill','none');
gA.selectAll('g.x').data(ADY.filter(d=>d[2]==='separado')).join('g').attr('transform',([a,b])=>`translate(${(POS[a][0]+POS[b][0])/2},${(POS[a][1]+POS[b][1])/2})`).call(g=>{g.append('circle').attr('r',8).attr('fill','#0b0d12').attr('stroke','#E0623F');g.append('path').attr('d','M-3.5 -3.5L3.5 3.5M3.5 -3.5L-3.5 3.5').attr('stroke','#E0623F').attr('stroke-width',1.6)});
const acc=gB.selectAll('path').data(ACC).join('path').attr('fill','none').attr('stroke-width',2).attr('stroke',d=>ATY[d[2]].c).attr('stroke-dasharray',d=>ATY[d[2]].d)
 .attr('marker-end',d=>`url(#ma${Object.keys(ATY).indexOf(d[2])})`).attr('d',([a,b])=>{const p=clip(a,b),q=clip(b,a);const mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2,dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy)||1;const o=28;return`M${p}Q${mx-dy/L*o},${my+dx/L*o} ${q}`});
if(!reduce)acc.attr('stroke-dashoffset',0).each(function(d){if(ATY[d[2]].d){const s=d3.select(this);(function loop(){s.attr('stroke-dashoffset',0).transition().duration(1600).ease(d3.easeLinear).attr('stroke-dashoffset',-22).on('end',loop)})()}});
const nodes=Object.keys(POS);
const ng=gN.selectAll('g').data(nodes).join('g').attr('transform',id=>`translate(${POS[id]})`).style('cursor','pointer');
ng.append('rect').attr('x',id=>-NW(id)/2).attr('y',id=>-NH(id)/2).attr('width',NW).attr('height',NH).attr('rx',10)
 .attr('fill',id=>CTX[id]?'#0e1016':'#171b24').attr('stroke',id=>CTX[id]?'#3a3f4d':(eDyn(id)?dcol(eDyn(id)):'#555')).attr('stroke-width',id=>CTX[id]?1:1.8).attr('stroke-dasharray',id=>CTX[id]?'3 3':(id==='E1'?'5 4':null));
ng.append('text').attr('text-anchor','middle').attr('y',id=>CTX[id]?5:-11).attr('font',id=>CTX[id]?'500 13px Instrument Sans':'600 14px JetBrains Mono').attr('fill',id=>CTX[id]?'#8b93a6':(eDyn(id)?dcol(eDyn(id)):'#ccc')).text(id=>CTX[id]?CTX[id]:id);
ng.filter(id=>!CTX[id]).append('text').attr('text-anchor','middle').attr('y',8).attr('font','600 14px Instrument Sans').attr('fill','#E9E6DE').each(function(id){const t=d3.select(this);const n=eN(id).replace('Distrito biotecnológico · ','Distrito biotec. · ').replace('Espacio de aprendizaje y huertas escolares','Aprendizaje y huertas escolares').replace('Espacio de aprendizaje y deliberación','Aprendizaje y deliberación').replace('Puntos de separación en hogares y tiendas','Separación en hogares y tiendas');
 const w=n.split(' ');let l1='',l2='';w.forEach(x=>{((l1+' '+x).trim().length<=21&&!l2)?l1=(l1+' '+x).trim():l2=(l2+' '+x).trim()});t.append('tspan').attr('x',0).text(l1);if(l2)t.append('tspan').attr('x',0).attr('dy',16).text(l2.length>23?l2.slice(0,22)+'…':l2)});
ng.attr('opacity',0).transition().delay((d,i)=>reduce?0:i*45).duration(400).attr('opacity',1);
function hlSpaces(set){ng.attr('opacity',id=>!set||set.has(id)||CTX[id]?1:.2);ady.attr('opacity',d=>!set||set.has(d[0])||set.has(d[1])?1:.1);acc.attr('opacity',d=>!set||set.has(d[0])||set.has(d[1])?1:.1)}
function side(id){const S=$('#side');if(!id){S.innerHTML=`<h3>Cómo leer el diagrama</h3><p>Los recuadros son los espacios de la matriz (E1 a E16), con el color de su dinámica. Los grises punteados son el contexto que la matriz menciona: vivienda, conjunto, humedal y vía.</p><p>Las líneas sin flecha son adyacencias; las flechas son accesos. Dos espacios pueden ser vecinos sin paso directo, como la estación de compostaje y la huerta de la ronda del humedal.</p><p style="color:var(--mute)">Avance de lectura: el diagrama de espacios completo y la sintaxis espacial quedan para el 2 de noviembre.</p>`;return}
 const a=ADY.filter(d=>d[0]===id||d[1]===id),c=ACC.filter(d=>d[0]===id||d[1]===id);const nm=x=>CTX[x]||(x+' · '+eN(x));
 S.innerHTML=`<div class="k" style="color:${eDyn(id)?dcol(eDyn(id)):'var(--mute)'}">${id}${eDyn(id)?' · '+eDyn(id):''}</div><h3>${esc(CTX[id]||eN(id))}</h3>`+
  (a.length?`<p style="margin:10px 0 4px;color:var(--ink);font-weight:600">Adyacencia</p>`+a.map(d=>`<div class="rel">${DTY[d[2]].n}: ${esc(nm(d[0]===id?d[1]:d[0]))}${d[3]?' · '+esc(d[3]):''}</div>`).join(''):'')+
  (c.length?`<p style="margin:10px 0 4px;color:var(--ink);font-weight:600">Acceso</p>`+c.map(d=>`<div class="rel">${d[0]===id?'Hacia':'Desde'} ${esc(nm(d[0]===id?d[1]:d[0]))}: ${d[2]}${d[3]?' · '+esc(d[3]):''}</div>`).join(''):'')+
  rows.filter(r=>r.e===id).map(r=>`<div class="rel"><a href="#${r.id}" style="color:var(--ochre)">${r.id}</a> ${esc(r.act)}</div>`).join('')}
let selE=null;ng.on('click',(e,id)=>{e.stopPropagation();selE=selE===id?null:id;side(selE);hlSpaces(selE?new Set([selE,...ADY.concat(ACC).filter(d=>d[0]===selE||d[1]===selE).flatMap(d=>[d[0],d[1]])]):null)});
svg.on('click',()=>{selE=null;side();hlSpaces(null)});side();

// relación con el modelo
$('#models').innerHTML=BUC.map(([k,n,c])=>{const rs=rows.filter(r=>new RegExp(k,'i').test(r.red));
 return`<div class="mcard" style="--c:${c}"><h3>${n}</h3><div style="color:var(--mute);font-size:12px;margin-bottom:6px">${rs.length} actividad${rs.length===1?'':'es'}</div>${rs.map(r=>`<div style="margin-top:6px"><a href="#${r.id}" style="color:${c};font:600 11px JetBrains Mono">${r.id}</a> ${esc(r.act)}</div>`).join('')||'Sin actividades'}</div>`}).join('');
})();
