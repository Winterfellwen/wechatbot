import json, os
path = os.environ['TEMP'] + '\\wb_deploy_status.json'
with open(path, encoding='utf-8-sig') as f:
    data = json.load(f)
for x in data:
    d = x['deploy']
    print(f"{d['status']:15} {d['commit']['message'][:60]}")
