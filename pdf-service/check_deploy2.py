import json, os
path = os.environ['TEMP'] + '\\deploy2.json'
with open(path, encoding='utf-8-sig') as f:
    d = json.load(f)
dep = d[0]['deploy']
print(f"Status: {dep['status']}")
print(f"Finished: {dep.get('finishedAt', 'N/A')}")
