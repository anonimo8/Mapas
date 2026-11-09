/** Estadísticas derivadas de ubicación, sin depender de territory_id.
 * No debe incluir datos personales en las respuestas públicas.
 */
import {pointInPolygon} from './admin/private-points.js';

export function pointInsideTerritory(point,geometry){
  const lat=Number(point?.lat),lng=Number(point?.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!geometry)return false;
  const inRings=rings=>{
    if(!Array.isArray(rings)||!Array.isArray(rings[0]))return false;
    const outer={type:'Polygon',coordinates:[rings[0]]};
    return pointInPolygon(lng,lat,outer) && !rings.slice(1).some(ring=>pointInPolygon(lng,lat,{type:'Polygon',coordinates:[ring]}));
  };
  if(geometry.type==='Polygon')return inRings(geometry.coordinates);
  if(geometry.type==='MultiPolygon')return Array.isArray(geometry.coordinates)&&geometry.coordinates.some(inRings);
  return false;
}

export function territoryPointCounts(territories,points){
  return territories.map(t=>{
    let geometry;
    try{geometry=typeof t.geometry==='string'?JSON.parse(t.geometry):t.geometry;}catch(_){geometry=null;}
    let men=0,women=0;
    for(const p of points){
      if(!pointInsideTerritory(p,geometry))continue;
      if(p.sex==='hombre')men++;
      else if(p.sex==='mujer')women++;
    }
    return {id:String(t.id),men,women};
  });
}
