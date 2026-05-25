# -*- coding: utf-8 -*-
with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\report\report.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Replace emojis in report page
content = re.sub(r'<view class="unread-icon">.*?</view>', '<image class="unread-icon" src="/images/icons/tab-report@2x.png" mode="aspectFit"/>', content)
content = re.sub(r'<text class="ai-title-icon">.*?</text>', '<image class="ai-title-icon" src="/images/icons/ai-companion@2x.png" mode="aspectFit"/>', content)
content = re.sub(r'换一份报告', '换一份报告', content)
content = re.sub(r'🔄 换一份报告', '<image class="icon-xs" src="/images/icons/poem-sparkle@2x.png" mode="aspectFit"/> 换一份报告', content)
content = re.sub(r'🔄 重试', '<image class="icon-xs" src="/images/icons/poem-sparkle@2x.png" mode="aspectFit"/> 重试', content)
content = re.sub(r'<view class="empty-icon">.*?</view>', '<view class="empty-icon"><image src="/images/icons/empty-state@2x.png" mode="aspectFit"/></view>', content)

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\report\report.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
print('report.wxml updated')
