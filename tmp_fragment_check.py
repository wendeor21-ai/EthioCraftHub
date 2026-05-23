from pathlib import Path
import re
p = Path('client/src/pages/artisan/ManageOrders.jsx')
text = p.read_text(encoding='utf-8')
for i, line in enumerate(text.splitlines(), start=1):
    if '<>' in line or '</>' in line:
        print(f"{i}: {line}")
print('open count', len(re.findall(r'<>', text)))
print('close count', len(re.findall(r'</>', text)))
