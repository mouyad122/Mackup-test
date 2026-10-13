import os

REPLACEMENTS = {
    'ميكاب ديمو': 'فيلورا بيوتي',
    'Makeup Demo': 'Velora Beauty',
    'MAKEUP DEMO': 'VELORA BEAUTY'
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in REPLACEMENTS.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css', '.md')):
            process_file(os.path.join(root, file))
