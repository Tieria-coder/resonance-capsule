# -*- coding: utf-8 -*-
with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\calendar\calendar.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('\U0001f525'.encode('utf-8').decode('unicode_escape'), '<image class="streak-icon" src="/images/icons/plan-calendar@2x.png" mode="aspectFit"/>'),
]

# Actually do replacements by searching for the actual emoji text
import re

content = re.sub(r'<text class="streak-icon">.*?</text>', '<image class="streak-icon" src="/images/icons/plan-calendar@2x.png" mode="aspectFit"/>', content)
content = re.sub(r'<text class="ai-label">.*?</text>', '<view class="ai-label"><image class="icon-xs" src="/images/icons/ai-companion@2x.png" mode="aspectFit"/> AI：</view>', content)
content = re.sub(r'<view class="modal-close" bindtap="closeDayModal">.*?</view>', '<view class="modal-close" bindtap="closeDayModal"><image class="icon-sm" src="/images/icons/close@2x.png" mode="aspectFit"/></view>', content)

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\calendar\calendar.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
print('calendar.wxml updated')
