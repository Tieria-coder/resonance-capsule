# -*- coding: utf-8 -*-
import json

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\app.json', 'r', encoding='utf-8') as f:
    app = json.load(f)

app['tabBar'] = {
    'custom': True,
    'color': '#999999',
    'backgroundColor': '#ffffff',
    'borderStyle': 'white',
    'list': [
        {'pagePath': 'pages/index/index', 'text': '记录', 'iconPath': 'images/icons/tab-record@2x.png', 'selectedIconPath': 'images/icons/tab-record-selected@2x.png'},
        {'pagePath': 'pages/calendar/calendar', 'text': '日历', 'iconPath': 'images/icons/tab-calendar@2x.png', 'selectedIconPath': 'images/icons/tab-calendar-selected@2x.png'},
        {'pagePath': 'pages/report/report', 'text': '报告', 'iconPath': 'images/icons/tab-report@2x.png', 'selectedIconPath': 'images/icons/tab-report-selected@2x.png'},
        {'pagePath': 'pages/profile/profile', 'text': '我的', 'iconPath': 'images/icons/tab-profile@2x.png', 'selectedIconPath': 'images/icons/tab-profile-selected@2x.png'},
    ]
}

# Add custom tabBar component
if 'usingComponents' not in app:
    app['usingComponents'] = {}
app['usingComponents']['custom-tab-bar'] = 'custom-tab-bar/index'

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\app.json', 'w', encoding='utf-8') as f:
    json.dump(app, f, ensure_ascii=False, indent=2)

print('app.json updated with custom tabBar')