from pathlib import Path
p=Path('/mnt/data/mapa_ux_workspace/public/style.css')
s=p.read_text()
start=s.index('.destination-panel{')
end=s.index('\n.map-notice{',start)
s=s[:start]+'''/* El destino se presenta junto a su búsqueda, nunca en otra tarjeta flotante. */
.destination-panel{margin-top:12px;padding:11px;background:#f1f7f0;border:1px solid #d9e7da;border-radius:12px;box-shadow:none}
.destination-topline{display:flex;gap:9px;justify-content:space-between;align-items:flex-start;margin-bottom:11px}
.destination-body{min-width:0;flex:1}
.destination-kicker{display:block;font-size:9px;font-weight:800;letter-spacing:.09em;color:#6d967b;margin-bottom:4px}
.destination-body strong{font-size:13px;color:#254a39;display:block;line-height:1.35;overflow-wrap:anywhere}
.destination-body small{font-size:10px;color:#63816c;display:block;margin-top:3px;line-height:1.4}
.route-button{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:46px;background:#246548;color:#fff;border:0;border-radius:10px;font-weight:780;font-size:13px}
.route-button:hover{background:#174d38}
.route-button svg{height:19px;width:19px}
.route-button:disabled{opacity:.6;cursor:progress}
.clear-destination{border:0;background:#e2ebe2;color:#567063;border-radius:8px;min-width:29px;height:29px;font-size:20px;line-height:1}
'''+s[end:]
start=s.index('@media(max-width:600px){.search-panel')
end=s.index('/* R3:',start)
s=s[:start]+'''@media(max-width:600px){
  .search-panel{top:calc(10px + env(safe-area-inset-top,0px));left:calc(10px + env(safe-area-inset-left,0px));width:calc(100% - 80px);padding:11px;border-radius:15px;max-height:calc(56dvh - env(safe-area-inset-top,0px));overflow-y:auto;scrollbar-width:thin}
  .search-head{margin-bottom:9px;gap:7px}.search-emblem{width:30px;height:30px;font-size:19px;border-radius:9px}.search-head b{font-size:12px}.search-head small{font-size:9px}
  .map-search{height:43px}.map-search select{width:91px;font-size:10px;padding-left:6px}.map-search input{font-size:11px;padding:0 6px}.search-submit{height:35px;width:31px}
  .destination-panel{margin-top:9px;padding:10px}.destination-body strong{font-size:12px}.destination-body small{font-size:9px}.destination-topline{margin-bottom:9px}.route-button{height:44px;font-size:12px}
  .locate-button{top:calc(10px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px));min-height:42px;width:54px;justify-content:center;padding:10px 0}.locate-button span{display:none}
  .map-notice{bottom:calc(72px + env(safe-area-inset-bottom,0px));font-size:10px}.territory-label{width:31px;height:31px;font-size:12px}.territory-stats{gap:4px;padding:2px 4px;font-size:8px}
  .leaflet-control-zoom{margin-right:11px!important;margin-bottom:23px!important}
  .admin-entry{bottom:calc(26px + env(safe-area-inset-bottom,0px));left:9px;min-height:34px;padding:9px}.admin-entry span{display:none}
  .privacy-footnote{left:calc(55px + env(safe-area-inset-left,0px));bottom:calc(31px + env(safe-area-inset-bottom,0px));font-size:8px}
}
@media print{.search-panel,.locate-button,.map-notice,.leaflet-control-zoom,.admin-entry,.privacy-footnote{display:none!important}}
'''+s[end:]
start=s.index('/* R3:')
s=s[:start]+'''/* R4: GPS automático y panel de ruta simplificado. */
.route-panel{position:absolute;z-index:690;right:calc(18px + env(safe-area-inset-right,0px));top:calc(76px + env(safe-area-inset-top,0px));width:min(350px,calc(100% - 36px));max-height:calc(100dvh - 125px);overflow-y:auto;overscroll-behavior:contain;padding:16px;background:rgba(255,254,250,.985);border:1px solid #dce7dd;border-radius:17px;box-shadow:0 12px 34px rgba(22,56,37,.19);color:#2e5540;scrollbar-width:thin}
.route-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:9px}.route-head strong{display:block;font-size:16px;color:#23513a}.route-kicker{font-size:9px;color:#81978a;font-weight:800;letter-spacing:.09em}.route-close{border:0;background:#ecf3ea;border-radius:9px;font-size:23px;width:32px;height:32px;color:#52705e;line-height:1}
.route-status{font-size:12px;line-height:1.5;color:#426b53;background:#f0f6ed;border-radius:10px;padding:10px 12px;margin:0}.route-status.is-error{color:#91493b;background:#fdf0ed}
.route-retry{margin-top:10px;background:#245e47;color:#fff;border:0;border-radius:9px;padding:9px 13px;font-size:12px;font-weight:700}
.route-origin-fallback{margin-top:11px}.origin-explain{font-size:12px;line-height:1.45;color:#3e6350;margin:0 0 9px}
.route-origin-form{margin:0}.route-origin-search{display:flex;gap:6px}.route-origin-search input{min-width:0;flex:1;height:44px;padding:0 11px;background:#fff;border:1px solid #ceddcc;border-radius:10px;font-size:12px}.route-origin-search button{border:0;background:#245e47;color:#fff;border-radius:10px;padding:0 12px;font-size:11px;font-weight:780}
.route-origin-results{max-height:168px;overflow-y:auto;margin-top:8px;border:1px solid #e1e9e0;border-radius:10px}.route-origin-results button{display:block;width:100%;padding:11px;text-align:left;background:#fff;border:0;border-bottom:1px solid #e8ede6;font-size:11px;color:#315c43}.route-origin-results button:hover{background:#f0f7ef}
.route-alternatives{display:flex;justify-content:space-between;gap:10px;margin-top:11px}.route-origin-btn{border:0;background:none;color:#39765a;text-align:left;font-size:11px;font-weight:720;padding:5px 0;min-height:32px}.route-origin-btn.is-active{color:#134530;text-decoration:underline}.route-origin-btn:disabled{opacity:.55;cursor:progress}
.route-details{margin-top:10px}.route-summary{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:#e5f0e8}.route-summary strong{font-size:25px;letter-spacing:-.025em;color:#1f694a;white-space:nowrap}.route-summary span{font-size:12px;font-weight:750;color:#3d7456;line-height:1.4}
.route-disclosure{border-bottom:1px solid #e5ede4;padding:0 2px}.route-disclosure summary{padding:12px 4px;color:#356b4c;font-size:12px;font-weight:760;cursor:pointer;list-style-position:inside}.route-disclosure summary:hover{color:#173c2b}
.route-steps{margin:0 0 10px;padding:0 0 0 22px;max-height:185px;overflow-y:auto}.route-steps li{padding:7px 4px;border-bottom:1px solid #e9efe8;font-size:11px;line-height:1.4}.route-steps li small{display:block;color:#839589;margin-top:2px;font-size:10px}
.route-options{padding-bottom:5px}.route-mode-label{font-size:10px;font-weight:750;display:block;margin:5px 0;color:#64816d}.route-mode{width:100%;height:39px;padding:0 9px;border:1px solid #d9e5db;border-radius:9px;background:#fff;color:#2c634a;font-size:12px}
.route-change-origin,.route-clear{display:block;width:100%;margin-top:9px;padding:10px;background:#f6f9f4;color:#496f58;border:1px solid #dbe7d9;border-radius:9px;font-size:11px;font-weight:700;text-align:center}.route-advice{font-size:10px;line-height:1.45;color:#647a6a;margin:12px 2px 6px}.route-provider{display:block;color:#86998a;font-size:9px;line-height:1.35;margin-bottom:7px}
@media(max-width:600px){
  .route-panel{left:calc(10px + env(safe-area-inset-left,0px));right:calc(10px + env(safe-area-inset-right,0px));bottom:calc(17px + env(safe-area-inset-bottom,0px));top:auto;width:auto;max-height:calc(100dvh - 212px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));min-height:unset;padding:14px;border-radius:18px;box-shadow:0 9px 32px #263c2c44}
  .route-head strong{font-size:15px}.route-summary strong{font-size:23px}.route-steps{max-height:125px}
  .route-origin-search input{font-size:12px}.route-origin-results{max-height:112px}
}
@media(max-height:560px) and (max-width:600px){.route-panel{max-height:45dvh}.search-panel{max-height:47dvh}}
@media print{.route-panel{display:none!important}}
'''
p.write_text(s)
print('CSS updated')
