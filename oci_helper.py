"""OCI helper for menu storage - called by Node.js server via subprocess."""
import oci, json, sys, os
from oci.config import from_file

config = from_file()
bucket = "wechatbot-demo"

def upload_menu(user_id, merchant_id, menu_data):
    """Save menu JSON to OCI."""
    obj = oci.object_storage.ObjectStorageClient(config)
    ns = obj.get_namespace().data
    key = f"menus/{user_id}/{merchant_id}.json"
    body = json.dumps(menu_data, ensure_ascii=False).encode("utf-8")
    obj.put_object(ns, bucket, key, body)
    url = f"https://objectstorage.{config['region']}.oraclecloud.com/n/{ns}/b/{bucket}/o/{key}"
    return {"url": url}

def delete_menu(user_id, merchant_id):
    """Delete menu JSON from OCI."""
    obj = oci.object_storage.ObjectStorageClient(config)
    ns = obj.get_namespace().data
    key = f"menus/{user_id}/{merchant_id}.json"
    obj.delete_object(ns, bucket, key)
    return {"deleted": key}

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    if action == "upload" and len(sys.argv) >= 4:
        user_id = sys.argv[2]
        merchant_id = sys.argv[3]
        raw = sys.stdin.buffer.read().decode("utf-8-sig")
        menu_json = json.loads(raw)
        result = upload_menu(user_id, merchant_id, menu_json)
        print(json.dumps(result))
    elif action == "delete" and len(sys.argv) >= 4:
        user_id = sys.argv[2]
        merchant_id = sys.argv[3]
        result = delete_menu(user_id, merchant_id)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Usage: oci_helper.py upload <userId> <merchantId> (stdin: json)"}), file=sys.stderr)
        sys.exit(1)
