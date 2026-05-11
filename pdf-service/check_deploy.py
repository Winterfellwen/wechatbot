import json, os
path = os.environ['TEMP'] + '\\deploy.json'
with open(path, encoding='utf-8-sig') as f:
    d = json.load(f)
dep = d[0]['deploy']
print(f"ID: {dep['id']}")
print(f"Status: {dep['status']}")
print(f"Commit: {dep.get('commit', 'N/A')}")
print(f"FinishedAt: {dep.get('finishedAt', 'N/A')}")
