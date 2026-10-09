# Places: every map section the ROM's maps use vs the curated Emerald Map.
import json, re, sys, yaml
def norm(n): return re.sub(r"[^A-Z0-9]", "", (n or "").upper().replace("É", "E"))
mp = yaml.safe_load(open(f"{sys.argv[2]}/packages/game-data/sources/maps/emerald/map.yaml"))
ours = {norm(p["name"] if isinstance(p["name"], str) else next(iter(p["name"].values()))): p for p in mp["places"]}
o = json.load(open(sys.argv[1]))
got = {norm(p.get("name")): p for p in o["places"]}
print(f"{len(o['places'])} sections used by maps; ours {len(ours)} Places")
print("  in ROM, not ours:", sorted(f"{got[k].get('name')!r} (section {got[k]['mapsec']}, {got[k]['maps']} maps)" for k in got.keys() - ours.keys()))
print("  ours, not in ROM:", sorted(ours[k]["name"] for k in ours.keys() - got.keys()))
