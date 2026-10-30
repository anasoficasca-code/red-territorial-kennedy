# Descarga la matriz desde Google Sheets y genera matriz.json
import json,re,urllib.request,io,openpyxl,sys
URL='https://docs.google.com/spreadsheets/d/1wOZTiMrw6cD4VpwKN0VLG-70Hc_bJcSLzyd25WWxzH4/export?format=xlsx'
src=sys.argv[1] if len(sys.argv)>1 else None
data=open(src,'rb').read() if src else urllib.request.urlopen(URL).read()
ws=openpyxl.load_workbook(io.BytesIO(data),data_only=True).worksheets[0]
hdr=None;rows=[]
for r in ws.iter_rows(values_only=True):
    v=[(c or '').strip() if isinstance(c,str) else ('' if c is None else str(c)) for c in r]
    if not any(v): continue
    if hdr is None and 'Dinámica' in v: hdr=v.index('Problema y localización');continue
    if hdr is not None: rows.append(v[hdr:hdr+9])
clean=lambda s:re.sub(r'[ \t]+',' ',s.replace('\r','')).strip()
SP=[('E1','Corabastos',r'Espacio: Corabastos'),('E2','Huerta de vivienda informal',r'asentamiento informal'),('E3','Huerta de vivienda en altura',r'vivienda de altura'),
 ('E4','Huerta en lote baldío',r'terreno baldío'),('E5','Huerta en la ronda del humedal',r'ronda del humedal'),('E6','Comedor o cocina comunitaria',r'comedor o cocina'),
 ('E7','Punto de acopio y distribución',r'Espacio: punto de acopio'),('E8','Punto de venta de excedentes',r'punto de venta de excedentes'),('E9','Tienda de barrio',r'tienda de barrio'),
 ('E10','Estación de compostaje y semillero',r'^Espacio: estación de compostaje'),('E11','Puntos de separación en hogares y tiendas',r'puntos de separación'),
 ('E12','Distrito biotecnológico · cultivo',r'unidad de cultivo'),('E13','Distrito biotecnológico · procesamiento',r'zona de procesamiento'),
 ('E14','Espacio de aprendizaje y deliberación',r'aprendizaje y deliberación'),('E15','Espacio de aprendizaje y huertas escolares',r'aprendizaje y huertas escolares'),('E16','Tablero público',r'tablero público')]
dyn=[];out=[]
for i,v in enumerate(rows):
    v=[clean(x) for x in v]
    if not v[1]: continue
    if v[1] not in dyn: dyn.append(v[1])
    et=v[5];esp=re.search(r'Espacio:\s*(.*?)(?:\n|$)',et);tie=re.search(r'Tiempo:\s*(.*)',et,re.S)
    eid=next((e for e,n,rx in SP if re.search(rx,et,re.I|re.M)),'E?')
    nh=v[4];cond=''
    if 'Condiciones:' in nh: nh,cond=nh.split('Condiciones:',1)
    out.append({'id':'A%d'%(len(out)+1),'prob':v[0],'d':'D%d'%(dyn.index(v[1])+1),'din':v[1],'act':v[2],'hum':v[3].rstrip('.'),'nohum':clean(nh).rstrip('.') if clean(nh)!='—' else '','cond':clean(cond),
      'e':eid,'esp':clean(esp.group(1)) if esp else et,'tiempo':clean(tie.group(1)) if tie else '','ady':v[6],'acc':v[7],'red':v[8]})
pid=re.match(r'(P\d+)',out[0]['prob']).group(1) if out else 'P1'
json.dump({'rows':out,'din':[{'id':'D%d'%(i+1),'n':d} for i,d in enumerate(dyn)],'esp':[{'id':e,'n':n} for e,n,_ in SP]},open('matriz.json','w'),ensure_ascii=False,indent=1)
print(len(out),'filas',len(dyn),'dinámicas',[r['e'] for r in out])
