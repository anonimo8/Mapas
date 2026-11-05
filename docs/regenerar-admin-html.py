"""Regenera el código incluido en Worker desde las fuentes HTML/JS sin npm."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
pairs=[('admin-worker/admin.html','admin-worker/src/admin-page.js','ADMIN_HTML'),
       ('admin-worker/export-pdf-browser.js','admin-worker/src/export-pdf.js','EXPORT_PDF_JS')]
for origin,out,name in pairs:
    content=(root/origin).read_text(encoding='utf-8')
    (root/out).write_text('export const '+name+' = '+json.dumps(content,ensure_ascii=False)+';\n',encoding='utf-8')
    print('Generado',out)
