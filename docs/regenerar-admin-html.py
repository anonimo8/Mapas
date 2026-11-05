"""Después de editar admin-worker/admin.html, generar su literal importable."""
from pathlib import Path
import json
root = Path(__file__).resolve().parent.parent / 'admin-worker'
(root / 'src' / 'admin-page.js').write_text(
    'export const ADMIN_HTML = '+json.dumps((root/'admin.html').read_text(encoding='utf-8'),ensure_ascii=False)+';\n',
    encoding='utf-8')
print('admin-page.js actualizado')
