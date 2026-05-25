# -*- coding: utf-8 -*-
import re

emoji_pattern = re.compile(
    r'[\U0001F300-\U0001F9FF]'
    r'|[\U0001F600-\U0001F64F]'
    r'|[\U0001F680-\U0001F6FF]'
    r'|[\U0001F1E0-\U0001F1FF]'
    r'|[\u2600-\u26FF]'
    r'|[\u2700-\u27BF]'
    r'|[\U00002300-\U000023FF]'
)

pages = [
    r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\index\index.wxml',
    r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\plan\plan.wxml',
    r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\calendar\calendar.wxml',
    r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\report\report.wxml',
    r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\profile\profile.wxml',
]

for p in pages:
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    emojis = emoji_pattern.findall(content)
    name = p.split('\\')[-1]
    if emojis:
        unique = sorted(set(emojis))
        print('[' + name + '] Remaining emojis: ' + ' '.join(unique))
    else:
        print('[' + name + '] ✅ Clean - no emoji')
