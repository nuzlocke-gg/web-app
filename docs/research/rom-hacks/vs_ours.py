# Place-level diff: ROM extraction vs the committed Emerald game data.
#   python3 vs_ours.py <extract.json> <this repo>
import json, sys, re, yaml
out = json.load(open(sys.argv[1])); repo = sys.argv[2]
base = f"{repo}/packages/game-data/sources/maps/emerald"
species = json.load(open(f"{base}/generated/pokeapi.species.json"))["species"]
def norm(n): return re.sub(r"[^A-Z0-9]", "", n.upper().replace("♀", "F").replace("♂", "M").replace("É", "E"))
by_name = {norm(s["name"]): s["id"] for s in species}
rom = {}
unmapped = set()
for h in out["headers"]:
    if h["alternate"]: continue
    for t in h["tables"]:
        for m in t["mons"]:
            sid = by_name.get(norm(m["name"]))
            if not sid: unmapped.add(m["name"])
            rom.setdefault(norm(h["place"]), set()).add((t["method"], sid))
mp = yaml.safe_load(open(f"{base}/map.yaml"))
wild = json.load(open(f"{base}/generated/pokeapi.wild.json"))["areas"]
ours = {}
for pl in mp["places"]:
    for a in pl.get("areas") or []:
        for r in wild.get(a, {}).get("emerald", []):
            ours.setdefault(norm(pl["name"]), set()).add((r["method"], r["species"]))
print("species names that did not map to our ids:", sorted(unmapped))
print("Places only in ROM:", sorted(rom.keys() - ours.keys()), "| only in ours:", sorted(ours.keys() - rom.keys()))
same = [k for k in rom.keys() & ours.keys() if rom[k] == ours[k]]
print(f"Places compared: {len(rom.keys() & ours.keys())}; identical species-by-method: {len(same)}")
for k in sorted((rom.keys() & ours.keys()) - set(same)):
    print(" ", k, "rom-only:", sorted(rom[k] - ours[k]), "ours-only:", sorted(ours[k] - rom[k]))
