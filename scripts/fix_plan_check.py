# -*- coding: utf-8 -*-
with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\plan\plan.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

old = "<view class=\"reminder-check\">{{selectedReminders.indexOf(item.key) >= 0 ? '✓' : ''}}</view>"
new = "<view class=\"reminder-check\"><image wx:if=\"{{selectedReminders.indexOf(item.key) >= 0}}\" class=\"icon-xs\" src=\"/images/icons/success-confirm@2x.png\" mode=\"aspectFit\"/></view>"

if old in content:
    content = content.replace(old, new)
    print('replaced!')
else:
    print('not found')

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\plan\plan.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
