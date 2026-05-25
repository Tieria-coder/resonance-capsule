# -*- coding: utf-8 -*-
import re, sys

files = {
    'index': r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\index\index.wxml',
    'plan': r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\plan\plan.wxml',
    'report': r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\report\report.wxml',
    'profile': r'C:\Users\20883\.qclaw\workspace\emotion-capsule\pages\profile\profile.wxml',
}

emoji_pattern = re.compile(r'[✍✕💚🤖⏱✓🏷📊✨📷]')

for name, path in files.items():
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        found = emoji_pattern.findall(line)
        if found:
            sys.stdout.buffer.write((name + ':' + str(i+1) + ' -> ' + repr(line.strip()[:80]) + '\n').encode('utf-8'))
