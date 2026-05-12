import json, os
path = os.environ['TEMP'] + '\\wb_deploy10.json'
with open(path, encoding='utf-8-sig') as f:
    data = json.load(f)
print(f"Total deploys: {len(data)}")
for x in data:
    d = x['deploy']
    print(f"{d['status']:15} {d['commit']['id'][:10]} {d['commit']['message'][:60]}")
