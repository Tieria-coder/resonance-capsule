# -*- coding: utf-8 -*-
import re

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\profile\profile.wxml', 'r', encoding='utf-8') as f:
    content = f.read()

# 成就徽章
content = re.sub(r'<view class="section-title">🏆 成就徽章</view>', '<view class="section-title"><image class="icon-sm-inline" src="/images/icons/achievement-badge@2x.png" mode="aspectFit"/> 成就徽章</view>', content)

# 自定义情绪图标
content = re.sub(r'<view class="modal-title">🎨 自定义情绪图标</view>', '<view class="modal-title"><image class="icon-sm-inline" src="/images/icons/plan-seedling@2x.png" mode="aspectFit"/> 自定义情绪图标</view>', content)

# 魔法衣橱
content = re.sub(r'<view class="modal-title">👗 魔法衣橱</view>', '<view class="modal-title"><image class="icon-sm-inline" src="/images/icons/theme-wardrobe@2x.png" mode="aspectFit"/> 魔法衣橱</view>', content)

# 确认按钮
content = re.sub(r'换一份报告', '换一份报告', content)
content = re.sub(r'重试', '重试', content)

# 关闭按钮
content = re.sub(r'<view class="modal-close" bindtap="closeEmojiEditor">×</view>', '<view class="modal-close" bindtap="closeEmojiEditor"><image class="icon-sm" src="/images/icons/close@2x.png" mode="aspectFit"/></view>', content)
content = re.sub(r'<view class="modal-close" bindtap="closeWardrobe">×</view>', '<view class="modal-close" bindtap="closeWardrobe"><image class="icon-sm" src="/images/icons/close@2x.png" mode="aspectFit"/></view>', content)

with open(r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\profile\profile.wxml', 'w', encoding='utf-8') as f:
    f.write(content)
print('profile.wxml updated')
