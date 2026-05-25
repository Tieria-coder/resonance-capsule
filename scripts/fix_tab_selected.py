# -*- coding: utf-8 -*-
import json

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\app.json', 'r', encoding='utf-8') as f:
    app = json.load(f)

tabs = [
    ('pages/index/index', 'tab-record'),
    ('pages/calendar/calendar', 'tab-calendar'),
    ('pages/report/report', 'tab-report'),
    ('pages/profile/profile', 'tab-profile'),
]

for item in app['tabBar']['list']:
    for path, name in tabs:
        if item['pagePath'] == path:
            item['selectedIconPath'] = 'images/icons/' + name + '-selected@2x.png'
            print("Updated {}: selectedIconPath -> {}-selected@2x.png".format(name, name))

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\app.json', 'w', encoding='utf-8') as f:
    json.dump(app, f, ensure_ascii=False, indent=2)

print('Done!')
