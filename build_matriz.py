# Descarga la matriz del grupo desde Google Sheets, añade las filas de las correcciones y genera matriz.json
import json,re,urllib.request,io,openpyxl,sys
URL='https://docs.google.com/spreadsheets/d/1wOZTiMrw6cD4VpwKN0VLG-70Hc_bJcSLzyd25WWxzH4/export?format=xlsx'
src=sys.argv[1] if len(sys.argv)>1 else None
data=open(src,'rb').read() if src else urllib.request.urlopen(URL).read()
ws=openpyxl.load_workbook(io.BytesIO(data),data_only=True).worksheets[0]
clean=lambda s:re.sub(r'[ \t]+',' ',str(s or '').replace('\r','')).strip()
rows=[];h=None
for r in ws.iter_rows(values_only=True):
    v=[clean(c) for c in r]
    if not any(v): continue
    if h is None and 'Problema y localización' in v: h=v.index('Problema y localización');continue
    if h is not None: rows.append(v[h:h+9])
EXTRA=[
 ['P1 · Dependencia alimentaria de Corabastos · Corabastos','Abastecimiento de lo que Bogotá no produce (Corabastos con función reducida)','Recibir, almacenar y redistribuir carnes, granos, tubérculos e importados; tratar los residuos de carnes y las aguas de lavado dentro de la central','comerciantes mayoristas, transportadores, coteros, Junta Directiva de Corabastos, operador de aseo, UAESP','microbiota del tratamiento de aguas y del compostaje controlado. Condiciones: separación en la fuente y planta de tratamiento antes de verter','E13 Corabastos con función reducida (33,6 ha). Tiempo: madrugada diaria; recibo de carnes con cadena de frío','E13 separado de E14 por una barrera verde de amortiguación; sus bodegas de carnes junto a la planta de tratamiento','E13 → E05 indirecto vía E12 (camiones a los acopios barriales); E13 → E14 sin acceso','Variable: dependencia de Corabastos (volumen que pasa por la central). Nodos: Corabastos, alimentos que llegan de fuera. Bucle de equilibrio: la central responde si baja la compra'],
 ['P2 · Degradación del humedal La Vaca · franja liberada','Restauración del humedal en el área que cede Corabastos','Retirar rellenos y residuos, construir un humedal de tratamiento de flujo subsuperficial para la escorrentía y revegetalizar con especies nativas; monitorear agua y fauna','custodios del humedal (colectivos ambientales y vecinos), EAAB, Secretaría Distrital de Ambiente, Jardín Botánico','plantas acuáticas nativas (juncos y macrófitas), tingua bogotana y aves acuáticas, anfibios, microbiota del suelo. Condiciones: agua sin vertimientos, zonas sin paso humano para anidar','E14 Franja de restauración del humedal (8,4 ha). Tiempo: obra en 1 a 2 años; monitoreo mensual; temporadas de anidación sin intervención','E14 junto al humedal La Vaca y a E04 (huerta de la ronda); separado de E13 por la barrera verde','E04 ↔ E14 por senderos con horario; E13 → E14 sin acceso; fauna con paso libre','Nodos: humedal La Vaca, custodios (agencian por el humedal). Variable: área de hábitat recuperada. Bucle de refuerzo: más hábitat, más aves, más interés de los custodios'],
 ['P1 · Dependencia alimentaria de Corabastos · barrios','Compras conjuntas de lo que no se produce','Comprar cada mes en conjunto granos, tubérculos y carnes para tiendas, comedores y colegios, con el Fondo Común','tenderos, comedores comunitarios, colegios, núcleo de abastecimiento, vocería rotativa','no aplica','E05 y E11 (asamblea de compras). Tiempo: mensual','E11 junto a E05 para decidir viendo inventarios','Acceso abierto a los miembros del Fondo; E13 → E05 indirecto vía E12','Variable: capacidad de compra colectiva. Nodos: Fondo Común, tiendas, comedores. Bucle de refuerzo: compras cumplidas, más confianza, más miembros'],
]
out=[];dyn=[]
for v in rows+[e for e in EXTRA]:
    if not v[1]: continue
    added=v in EXTRA
    if v[1] not in dyn: dyn.append(v[1])
    et=v[5];m=re.match(r'(E\d{2})\s*(.*)',et)
    eid=m.group(1) if m else 'E??'
    tie=re.search(r'Tiempo:\s*(.*)',et,re.S);esp=re.split(r'\.?\s*Tiempo:',et)[0]
    esp=re.sub(r'^E\d{2}\s*','',esp).strip()
    nh=v[4];cond=''
    if 'Condiciones:' in nh: nh,cond=nh.split('Condiciones:',1)
    out.append({'id':'A%d'%(len(out)+1),'prob':v[0],'d':'D%d'%(dyn.index(v[1])+1),'din':v[1],'act':v[2],'hum':v[3].rstrip('.'),'nohum':clean(nh).rstrip('.') if clean(nh) not in('—','no aplica') else '','cond':clean(cond),
     'e':eid,'esp':esp,'tiempo':clean(tie.group(1)) if tie else '','ady':v[6],'acc':v[7],'red':v[8],'nueva':added})
ESP=[('E01','Huerta en vivienda informal'),('E02','Huerta en vivienda de altura'),('E03','Huerta en lote baldío'),('E04','Huerta en la ronda del humedal'),('E05','Punto de acopio y distribución barrial'),('E06','Tienda de barrio'),('E07','Punto de venta de excedentes'),('E08','Comedor o cocina comunitaria'),('E09','Compostaje y semillero comunitario'),('E10','Distrito biotecnológico (cultivo y procesamiento de hongos)'),('E11','Espacio de aprendizaje y deliberación'),('E12','Ruta corta del barrio (calles, ciclorruta)'),('E13','Corabastos con función reducida'),('E14','Franja de restauración del humedal')]
json.dump({'rows':out,'din':[{'id':'D%d'%(i+1),'n':d} for i,d in enumerate(dyn)],'esp':[{'id':e,'n':n} for e,n in ESP]},open('matriz.json','w'),ensure_ascii=False,indent=1)
print(len(out),'filas',len(dyn),'dinámicas',[r['e'] for r in out])
