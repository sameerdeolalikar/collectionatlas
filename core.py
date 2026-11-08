"""Validated document model. Synthetic fixtures only."""
from datetime import date, timedelta
import re

def integer(value, low, high, label):
    if type(value) is not int or not low <= value <= high:
        raise ValueError(f"{label} must be an integer between {low} and {high}.")
    return value

def text(value, label, maximum=120):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError(f"{label} must contain 1–{maximum} characters.")
    return value.strip()

def choice(value, allowed, label):
    if value not in allowed:
        raise ValueError(f"Invalid {label}.")
    return value

def items(raw, key):
    result=raw.get(key)
    if not isinstance(result,list) or len(result)>150:
        raise ValueError(f"{key} must be a list of at most 150 entries.")
    seen=set()
    for item in result:
        if not isinstance(item,dict): raise ValueError("Each entry must be an object.")
        key_id=item.get("id")
        if not isinstance(key_id,str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,60}",key_id) or key_id in seen:
            raise ValueError("Entry identifiers must be unique and valid.")
        seen.add(key_id)
    return result

def base(raw):
    if not isinstance(raw,dict) or type(raw.get("version")) is not int or raw["version"]!=1:
        raise ValueError("Expected a version 1 document.")
    return {"version":1,"title":text(raw.get("title"),"Title")}
def validate(raw):
    out=base(raw);folders=raw.get("folders")
    if not isinstance(folders,list) or not 1<=len(folders)<=30:raise ValueError("Use 1–30 collections.")
    out["folders"]=[text(v,"Collection name",60) for v in folders]
    if len(set(out["folders"]))!=len(out["folders"]):raise ValueError("Collection names must be unique.")
    out["items"]=[]
    for x in items(raw,"items"):
        tags=x.get("tags",[])
        if not isinstance(tags,list) or len(tags)>10:raise ValueError("Use at most ten tags.")
        tags=[text(v,"Tag",30).lower() for v in tags]
        if len(set(tags))!=len(tags):raise ValueError("Tags must be unique.")
        note = x.get("note")
        if note is not None and not isinstance(note, str):
            raise ValueError("Note must be text.")
        out["items"].append({"id":x["id"],"name":text(x.get("name"),"Item name"),"folder":choice(x.get("folder"),out["folders"],"collection"),"kind":choice(x.get("kind"),["paper","fabric","wood","metal"],"material"),"status":choice(x.get("status"),["available","reserved","archived"],"status"),"quantity":integer(x.get("quantity"),0,10000,"Quantity"),"tags":tags,"note":text(x.get("note") or "—","Note",1000)})
    return out

def analyze(doc):
    return {"metrics":{"Materials":len(doc["items"]),"Collections":len(doc["folders"]),"Available":sum(x["status"]=="available" for x in doc["items"]),"Total units":sum(x["quantity"] for x in doc["items"])}}
