import json,re,collections
B=json.load(open('/tmp/biotic_net.json'));rg=json.load(open('/tmp/realgeo.json'))
P=json.load(open('/tmp/problems.json'));POT=json.load(open('/tmp/pot.json'))
S=json.load(open('/home/claude/work/site/assets/red_kennedy.json'))
nodes={};edges=[]
def N(id,**k):
    nodes[id]={'id':id,**k}
def E(s,t,tipo,sub,ev,src='',m=''):
    if s in nodes and t in nodes and s!=t: edges.append({'s':s,'t':t,'k':tipo,'sub':sub,'ev':ev,'src':src,'m':m})
# ---- problemas (segundo corte)
G={1:'Hiperconcentración del mercado mayorista',2:'Saturación de los residuos',3:'Degradación del soporte ecológico'}
for r in P['ND']:
    if r[0]=='root': continue
    N('P_'+r[0],tipo='problema',name=r[1],short=(r[2] or r[1])[:60],grupo=r[4],gname=G.get(r[4],''),fuente='Mapa causal de problemáticas (problemaskennedy)')
for s,t,d in P['ED']:
    if s=='root' or t=='root': continue
    a,b=('P_'+s,'P_'+t) if d=='d' else ('P_'+t,'P_'+s)
    E(b,a,'causal','causa o reproduce','diagnóstico','problemaskennedy','El problema de origen produce o reproduce al de destino.')
# ---- conectografía POT
cap={c[0]:c[1] for c in POT['C']}
MERGE={'NOD-ACT01':'AMB04','NOD-ACT02':'A35','NOD-ACT04':'N06'}
def potType(r):
    c=r[2]
    if c=='Movilidad e infraestructura': return 'infraestructura'
    if c=='Condicionantes normativos': return 'norma'
    if c=='Actores clave': return 'actor'
    if c=='Aspectos poco atendidos':
        return 'especie' if r[0] in ('NOD-BIO01','NOD-BIO02','NOD-BIO03','NOD-BIO06','NOD-BIO07') else 'condicion'
    return 'lugar'
for r in POT['N']:
    if r[0] in MERGE: continue
    t=potType(r)
    N(r[0],tipo=t,name=r[1],short=r[1][:60],capa=r[2],loc=r[5],rol=r[6],tension=r[7],grupo_especie=(t=='especie'),fuente='Red territorial POT de Kennedy (conectografía, Corte II)')
SKIP={'Comparten entidad responsable','Comparten territorio (menos de 600 m)'}
KMAP={'Articulación funcional':'espacial','Fragmentación y barrera':'espacial','Presión ecológica':'conflicto','Presión socioeconómica y desplazamiento':'conflicto','Encadenamiento económico y plusvalía':'flujo','Soporte ecosistémico y cuidado':'cooperacion','Gestión e intervención institucional':'decision','Gobernanza y participación':'decision'}
skipped=0
for e in POT['E']:
    if e[3] in SKIP: skipped+=1;continue
    s=MERGE.get(e[1],e[1]);t=MERGE.get(e[2],e[2])
    E(s,t,KMAP.get(e[3],'espacial'),e[3],'documentada' if e[11] else 'diagnóstico',str(e[11] or 'Red POT'),str(e[5] or '')[:220])
# ---- actores (red social)
for n in S['nodes']:
    N(n['id'],tipo='actor',name=n['name'],short=n['short'],sph=n['sph'],cat=n['cat'],lv=n['lv'],fun=n.get('fun',''),fuente='Red de actores de Kennedy (redrelacionesociales)')
CK={'com':('flujo','comercial y abastecimiento'),'lab':('cooperacion','laboral'),'ser':('flujo','prestación de servicio'),'rec':('flujo','reciclaje y material'),'gov':('decision','gobierno, coordinación y control'),'par':('cooperacion','participación y solicitudes'),'esp':('espacial','coinciden en el mismo espacio')}
for l in S['links']:
    k,sub=CK.get(l['c'],('cooperacion',l['c']))
    E(l['s'],l['t'],k,sub,'diagnóstico','Red de actores del grupo',l.get('desc') or l.get('type',''))
# ---- especies registradas en Kennedy
full={n['i']:n for n in B['N']}
rx=re.compile(r'Kennedy|El Burro|La Vaca|Techo|Cra\.|Cl\.|Calle|Carrera|Patio Bonito|Tintal|Castilla|Timiza',re.I)
good={k for k,v in rg.items() if rx.search(str(v[4]))}
CAT=['Flora','Aves','Mamíferos','Artrópodos','Anfibios','Reptiles']
sel={}
for n in B['N']:
    if n['id'] in good or re.match(r'SIGAU-0(0[1-9]|1[0-2])$',n['id'] or ''):
        g=rg.get(n['id'])
        nm=re.sub(r'\s*\(SIGAU-\d+\)','',n['name'] or '')
        N('S_'+n['id'],tipo='especie',name=nm,short=nm[:40],sci=n['sci'],taxon=CAT[n['cat']] if n['cat']<6 else '',img=n['img'],
          presencia=('registrada en Kennedy (iNaturalist)' if g else 'registrada en Kennedy (censo SIGAU)'),lugar=(g[4] if g else 'Arbolado urbano SIGAU'),obs=(g[6] if g else ''),fecha=(g[7] if g else ''),lat=(g[2] if g else None),lon=(g[3] if g else None),fuente='Red de interacciones bióticas (humedalburro)')
        sel[n['i']]='S_'+n['id']
for e in B['E']:
    if e['s'] in sel and e['t'] in sel:
        E(sel[e['s']],sel[e['t']],'ecologica',e['type'],'potencial','Regla de afinidad de la red biótica',e['rat'])
# ---- puentes entre redes
N('L_ARB',tipo='lugar',name='Arbolado urbano de Kennedy (SIGAU)',short='Arbolado urbano (SIGAU)',fuente='Censo SIGAU · Jardín Botánico',loc='Calles, parques y separadores')
HAB={'El Burro':'NOD-EEP01','La Vaca':'NOD-EEP02','Techo':'NOD-EEP03'}
for i,sid in sel.items():
    n=nodes[sid];lug=n['lugar']
    hid=next((v for k,v in HAB.items() if k in lug),None)
    if hid: E(sid,hid,'espacial','registrada en el hábitat','documentada','iNaturalist '+(n['obs'] or ''),'Registro georreferenciado de la especie en el humedal.')
    elif lug=='Arbolado urbano SIGAU': E(sid,'L_ARB','espacial','registrada en el hábitat','documentada','Censo SIGAU','Individuos censados en Kennedy.')
LOC={'may':['NOD-ECO01'],'res':['NOD-ECO03','NOD-ECO01'],'eco':['NOD-EEP01','NOD-EEP02','NOD-EEP03'],'hig':['NOD-ECO01'],'epi':['NOD-USO04'],'dep':['NOD-ECO01'],'trans':['NOD-MOV02','NOD-MOV03','NOD-ECO05'],'desp':['NOD-MOV06','NOD-MOV08'],'conc':['NOD-ECO04'],'dens':['NOD-AE15','NOD-USO03'],'esp':['NOD-AE15'],'clust':['NOD-ECO02','NOD-ECO05'],'san':['NOD-BIO08','NOD-EEP04'],'aguasres':['NOD-BIO08'],'cargas':['NOD-EEP04','NOD-EEP08'],'calagua':['NOD-EEP02','NOD-EEP04'],'aire':['NOD-MOV02','NOD-MOV03'],'no2':['NOD-MOV02','NOD-BIO04'],'biodiv':['NOD-EEP09','NOD-BIO01'],'hab':['NOD-EEP09'],'lluvia':['NOD-CON06'],'plan':['NOD-AE15'],'supcons':['NOD-BIO05'],'suelo':['NOD-BIO05'],'imperm':['NOD-BIO05'],'frag':['NOD-EEP09'],'perdveg':['NOD-EEP09']}
for p,ls in LOC.items():
    for l in ls: E('P_'+p,l,'espacial','se localiza en','diagnóstico','Corte II: problema localizado','Expresión espacial del problema.')
ACTP=[('may','A01','conflicto','lo produce'),('may','A02','decision','decide sobre la central'),('may','A13','conflicto','lo soporta'),('may','A15','conflicto','depende de la central'),
 ('res','A23','conflicto','genera residuos'),('res','A28','decision','opera la recolección'),('res','A27','cooperacion','recupera material'),('res','A25','cooperacion','recupera material'),
 ('trans','A10','conflicto','lo produce'),('trans','LOG01','conflicto','lo produce'),('trans','A66','decision','regula la carga'),
 ('aire','LOG01','conflicto','emite'),('no2','LOG01','conflicto','emite'),('aire','A37','conflicto','lo soporta'),
 ('calagua','A01','conflicto','vertimientos'),('cargas','A01','conflicto','vertimientos'),('calagua','N06','decision','opera la red y el humedal'),('cargas','A33','decision','controla vertimientos'),
 ('biodiv','AMB04','cooperacion','cuida el hábitat'),('hab','AMB04','cooperacion','cuida el hábitat'),('biodiv','A33','decision','autoridad ambiental'),
 ('dens','NOD-ACT03','conflicto','lo impulsa'),('esp','NOD-ACT03','conflicto','lo impulsa'),('plan','NOD-ACT06','decision','planea el suelo'),
 ('dep','A08','conflicto','pierde mercado'),('dep','A15','conflicto','depende de la central'),('hig','N05','decision','vigilancia sanitaria'),('epi','N05','decision','vigilancia sanitaria')]
for p,a,k,sub in ACTP: E('P_'+p,a,k,sub,'hipótesis','Decisión de diseño del grupo','Relación entre el problema y el actor que lo produce, soporta o gestiona.')
ACTL=[('A01','NOD-ECO01','espacial','opera en'),('A02','NOD-ECO01','decision','decide sobre'),('A13','NOD-ECO01','espacial','trabaja en'),('A06','NOD-ECO01','espacial','vende en'),
 ('AMB04','NOD-EEP01','cooperacion','custodia'),('AMB04','NOD-EEP02','cooperacion','custodia'),('AMB04','NOD-EEP03','cooperacion','custodia'),
 ('N06','NOD-EEP01','decision','administra'),('N06','NOD-EEP02','decision','administra'),('N06','NOD-EEP03','decision','administra'),
 ('A33','NOD-CON02','decision','aplica el plan de manejo'),('A10','NOD-ECO05','espacial','opera en'),('LOG01','NOD-MOV02','espacial','circula por'),('LOG01','NOD-ECO05','espacial','circula por'),
 ('A27','NOD-ECO03','espacial','trabaja en'),('A26','NOD-ECO03','espacial','trabaja en'),('A56','NOD-ECO03','espacial','trabaja en'),('A25','NOD-ECO03','espacial','trabaja en'),
 ('A34','NOD-ACT05','decision','hace parte de'),('A33','NOD-ACT05','decision','hace parte de'),('N06','NOD-ACT05','decision','hace parte de'),('AMB01','NOD-CUI03','espacial','funciona en'),('COM_HUE','L_ARB','cooperacion','siembra y cuida')]
for a,l,k,sub in ACTL: E(a,l,k,sub,'diagnóstico','Diagnóstico Corte II / red de actores','Relación del actor con el lugar.')
# actores y especies (cuidado y monitoreo: hipótesis)
birds=[sid for sid in sel.values() if nodes[sid]['taxon']=='Aves' and any(h in nodes[sid]['lugar'] for h in HAB)]
for sid in birds[:12]: E('AMB04',sid,'cooperacion','monitorea y cuida','hipótesis','Decisión de diseño del grupo','Monitoreo comunitario de aves en humedales.')
for sid in [s for s in sel.values() if nodes[s]['taxon']=='Flora'][:12]: E('COM_HUE',sid,'cooperacion','siembra y mantiene','hipótesis','Decisión de diseño del grupo','Huertas y siembras que sostienen flora.')
# ---- propuesta (guion del corte)
PROPS=[('X_ABAST','Núcleo de abastecimiento','Define aportes, compras y reglas del Fondo Común'),('X_FONDO','Fondo Común de Abastecimiento','Administración rotativa, informes públicos y vocerías revocables'),
 ('X_HORAS','Mesa de horarios de carga','Transportadores, coteros y vecinos acuerdan franjas de cargue'),('X_RESID','Núcleo de residuos (recicladores cogestores)','Recicladores organizados como cogestores remunerados del metabolismo circular'),
 ('X_HUMED','Guardianía de los humedales','Quienes custodian el humedal encabezan las decisiones sobre él')]
for i,n,d in PROPS: N(i,tipo='propuesta',name=n,short=n,fun=d,fuente='Propuesta del grupo (Corte III)')
PE=[('A15','X_ABAST','decision','propone'),('INF03','X_ABAST','decision','propone'),('COM_HUE','X_ABAST','decision','propone'),('A08','X_ABAST','cooperacion','discute condiciones'),('A10','X_ABAST','cooperacion','discute condiciones'),('A06','X_ABAST','cooperacion','discute condiciones'),
 ('X_ABAST','X_FONDO','decision','define aportes y compras'),('X_FONDO','A08','flujo','compras locales'),('X_FONDO','A15','flujo','abastecimiento'),('X_FONDO','INF03','flujo','abastecimiento'),
 ('A10','X_HORAS','decision','participa'),('A13','X_HORAS','decision','participa'),('A37','X_HORAS','decision','participa'),('X_HORAS','NOD-MOV02','espacial','regula el uso de'),('X_HORAS','NOD-ECO01','espacial','regula el cargue en'),('A66','X_HORAS','decision','autoriza'),
 ('A25','X_RESID','decision','encabeza'),('A27','X_RESID','decision','participa'),('A26','X_RESID','decision','participa'),('A23','X_RESID','cooperacion','entrega material'),('X_RESID','NOD-ECO03','espacial','opera en'),('A32','X_RESID','decision','reconoce y remunera'),
 ('AMB04','X_HUMED','decision','encabeza'),('A37','X_HUMED','decision','participa'),('X_HUMED','NOD-EEP01','cooperacion','cuida'),('X_HUMED','NOD-EEP02','cooperacion','cuida'),('X_HUMED','NOD-EEP03','cooperacion','cuida'),('N06','X_HUMED','decision','comparte datos'),
 ('X_ABAST','P_dep','decision','aborda'),('X_HORAS','P_trans','decision','aborda'),('X_RESID','P_res','decision','aborda'),('X_HUMED','P_eco','decision','aborda'),('X_FONDO','P_may','decision','reduce dependencia')]
for s,t,k,sub in PE: E(s,t,k,sub,'propuesta','Propuesta del grupo (Corte III)','Relación propuesta por el grupo.')
deg=collections.Counter();[deg.update([e['s'],e['t']]) for e in edges]
iso=[i for i in nodes if deg[i]==0]
for i in iso: nodes.pop(i)
out={'nodes':list(nodes.values()),'edges':edges,'stats':{'pot_omitidas':skipped}}
json.dump(out,open('data.json','w'),ensure_ascii=False)
print(collections.Counter(n['tipo'] for n in nodes.values()),len(edges),collections.Counter(e['k'] for e in edges),collections.Counter(e['ev'] for e in edges),'iso',len(iso),'skip',skipped)
