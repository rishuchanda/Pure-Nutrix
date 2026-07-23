import re
with open('/Users/rishuchanda/Desktop/1 pure nutrix website/Bath & Body – Minimalist.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove script and style
content = re.sub(r'<(script|style).*?</\1>', '', content, flags=re.DOTALL | re.IGNORECASE)
# Remove all html tags
text = re.sub(r'<[^>]+>', ' ', content)
# Replace multiple spaces with single newline
lines = [line.strip() for line in text.splitlines() if line.strip()]

for i, line in enumerate(lines):
    if len(line) > 10:
        print(f"{i}: {line}")
