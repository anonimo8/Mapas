// Unicamente se importa desde el Worker privado, que exige Cloudflare Access y ADMIN_EMAIL.
export const isCoord = (lat,lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -18.5 && lat <= 0 && lng >= -82.5 && lng <= -68;
export const isUUID = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function normalizePrivatePoint(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw Error('Datos inválidos.');
  const lat=Number(b.lat), lng=Number(b.lng);
  const sex=b.sex;
  const territoryId=b.territory_id == null || b.territory_id === '' ? null : String(b.territory_id);
  const note=typeof b.note==='string' ? b.note.trim() : '';
  if(!isCoord(lat,lng)) throw Error('Ubicación inválida o fuera de Perú.');
  if(sex!=='hombre' && sex!=='mujer') throw Error('Selecciona hombre o mujer.');
  if(territoryId!==null && !isUUID(territoryId)) throw Error('ID de territorio inválido.');
  if(note.length>120) throw Error('La nota no puede superar 120 caracteres.');
  return {lat,lng,sex,territoryId,note};
}

export function pointInPolygon(lng,lat,polygon){
  if(!polygon || polygon.type!=='Polygon' || !Array.isArray(polygon.coordinates?.[0])) return false;
  const ring=polygon.coordinates[0]; let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    // Considerar como "dentro" también puntos exactamente sobre el contorno.
    const dx=xj-xi,dy=yj-yi,cross=(lng-xi)*dy-(lat-yi)*dx;
    if(Math.abs(cross)<1e-9 && lng>=Math.min(xi,xj)-1e-9 && lng<=Math.max(xi,xj)+1e-9 && lat>=Math.min(yi,yj)-1e-9 && lat<=Math.max(yi,yj)+1e-9) return true;
    if((yi>lat)!==(yj>lat) && lng < (xj-xi)*(lat-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}

export async function validatePrivateAssignment(env,point,editingId=null){
  if(!point.territoryId)return;
  const t=await env.PUBLIC_DB.prepare('SELECT id,geometry FROM territories WHERE id=?').bind(point.territoryId).first();
  if(!t)throw Error('El territorio seleccionado no existe.');
  if(!pointInPolygon(point.lng,point.lat,JSON.parse(t.geometry)))throw Error('El punto está fuera del contorno del territorio. Ajusta su posición o déjalo sin asignar.');
  const count=await env.PRIVATE_DB.prepare('SELECT COUNT(*) AS n FROM private_person_points WHERE territory_id=? AND id<>?')
    .bind(point.territoryId,editingId || '').first();
  if(Number(count?.n || 0)>=6)throw Error('Este territorio ya tiene seis puntos privados. Para añadir más, divide el territorio o elige otro.');
}
