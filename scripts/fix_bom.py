# -*- coding: utf-8 -*-
import os, glob

workspace = r'C:\Users\20883\.qclaw\workspace\emotion-capsule'
BOM = b'\xef\xbb\xbf'

for path in glob.glob(workspace + r'/**/*.json', recursive=True):
    with open(path, 'rb') as f:
        raw = f.read()
    if raw.startswith(BOM):
        stripped = raw[len(BOM):]
        # Fix CRLF -> LF while we're at it
        stripped = stripped.replace(b'\r\n', b'\n')
        with open(path, 'wb') as f:
            f.write(stripped)
        print('Fixed BOM: ' + path)

print('Done!')