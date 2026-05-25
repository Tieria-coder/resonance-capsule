# -*- coding: utf-8 -*-
import re

# ========== index.wxml ==========
with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\index\index.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<view class="mode-tab {{diaryMode ? \'active\' : \'\'}}" bindtap="switchToDiary">🤖 A', '<view class="mode-tab {{diaryMode ? \'active\' : \'\'}}" bindtap="switchToDiary"><image class="icon-xs" src="/images/icons/ai-companion@2x.png" mode="aspectFit"/> A')
content = re.sub(r'<view class="tag-remove" catchtap="removeSubEmotion"[^>]*>✕</view>', '<image class="tag-remove" src="/images/icons/close@2x.png" mode="aspectFit"/>', content)
content = re.sub(r"\{\{aiLoading \? '🤖 AI思考中\.\.\.' : '确定保存'\}\}", '{{aiLoading ? \'AI思考中...\' : \'确定保存\'}}', content)
content = re.sub(r'<view class="modal-title">写点什么吧 ✍️</view>', '<view class="modal-title">写点什么吧 <image class="icon-xs-inline" src="/images/icons/write-something@2x.png" mode="aspectFit"/></view>', content)
content = re.sub(r"\{\{aiLoading \? '🤖 AI理解中\.\.\.' : '🤖 让AI来理解'\}\}", '{{aiLoading ? \'AI理解中...\' : \'让AI来理解\'}}', content)
content = re.sub(r'<view class="chat-close" bindtap="closeChat">✕</view>', '<view class="chat-close" bindtap="closeChat"><image class="icon-sm" src="/images/icons/close@2x.png" mode="aspectFit"/></view>', content)
content = re.sub(r'已达今日上限，明天再来 💚', '已达今日上限，明天再来 <image class="icon-xs-inline" src="/images/icons/today-done@2x.png" mode="aspectFit"/>', content)

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\index\index.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
print('index.wxml updated')

# ========== plan.wxml ==========
with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\plan\plan.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<view class="mp-theme"[^>]*>🏷 {{item.theme}}</view>', '<view class="mp-theme"><image class="icon-xs-inline" src="/images/icons/plan-tag@2x.png" mode="aspectFit"/> {{item.theme}}</view>', content)
content = re.sub(r'<text>⏱ 一期 {{item\.cycle_days \|\| 7}} 天</text>', '<text><image class="icon-xs-inline" src="/images/icons/plan-clock@2x.png" mode="aspectFit"/> 一期 {{item.cycle_days || 7}} 天</text>', content)
content = re.sub(r"<view class=\"reminder-check\">{{selectedReminders\.indexOf\(item\.key\) >= 0 \? '✓' : ''\}</view>", "<view class=\"reminder-check\"><image wx:if=\"{{selectedReminders.indexOf(item.key) >= 0}}\" class=\"icon-xs\" src=\"/images/icons/success-confirm@2x.png\" mode=\"aspectFit\"/></view>", content)

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\plan\plan.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
print('plan.wxml updated')

# ========== report.wxml ==========
with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\report\report.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

# Line 102 - check what it is
content = re.sub(r'📊 条形图', '<image class="icon-xs" src="/images/icons/chart-bar@2x.png" mode="aspectFit"/> 条形图', content)

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\report\report.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
print('report.wxml updated')

# ========== profile.wxml ==========
with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\profile\profile.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<view class="edit-upload-btn"[^>]*>📷 上传图片</view>', '<view class="edit-upload-btn" bindtap="chooseImage"><image class="icon-xs" src="/images/icons/camera@2x.png" mode="aspectFit"/> 上传图片</view>', content)
content = re.sub(r'选择一个你喜欢的主题吧 ✨', '选择一个你喜欢的主题吧 <image class="icon-xs-inline" src="/images/icons/poem-sparkle@2x.png" mode="aspectFit"/>', content)
content = re.sub(r'<view class="theme-check"[^>]*>✓</view>', '<view class="theme-check"><image class="icon-xs" src="/images/icons/success-confirm@2x.png" mode="aspectFit"/></view>', content)

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\profile\profile.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
print('profile.wxml updated')

print('All done!')
