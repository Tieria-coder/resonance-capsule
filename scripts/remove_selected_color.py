# -*- coding: utf-8 -*-
import json, copy

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\app.json', 'r', encoding='utf-8') as f:
    app = json.load(f)

# Remove selectedColor so colored selected icons are not re-tinted
if 'selectedColor' in app['tabBar']:
    del app['tabBar']['selectedColor']
    print('Removed selectedColor from tabBar')

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\app.json', 'w', encoding='utf-8') as f:
    json.dump(app, f, ensure_ascii=False, indent=2)

print('Done!')