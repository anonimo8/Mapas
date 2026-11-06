/* Paleta estable compartida entre mapa público y editor. No se guarda en las bases de datos. */
(()=>{'use strict';
const colors=['#227D78','#C76F45','#6B67B6','#D39A36','#387CB3','#AE658D','#67944D','#B45F5C','#568BA0','#9A7B42','#775EAA','#398A70'];
function territoryColor(territory){
 const raw=Number(territory?.number),n=Math.max(1,Number.isFinite(raw)?Math.abs(Math.trunc(raw)):1);
 if(n<=colors.length)return colors[n-1];
 // Números superiores a 12: variaciones estables (ángulo áureo), sin repetir la paleta fija.
 const hue=((n*137.508)%360).toFixed(3);
 const saturation=[53,59,64][n%3],lightness=[39,43,47][n%3];
 return `hsl(${hue} ${saturation}% ${lightness}%)`;
}
window.TerritoryPalette={colors,territoryColor};
})();
