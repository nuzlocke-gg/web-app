# One-time rows: ROM scan vs the hand-checked Emerald one-time.yaml.
import json, re, sys, yaml
o = json.load(open(sys.argv[1])); repo = sys.argv[2]
base = f"{repo}/packages/game-data/sources/maps/emerald"
def norm(n): return re.sub(r"[^A-Z0-9]", "", (n or "").upper().replace("♀", "F").replace("♂", "M").replace("É", "E"))
places = {norm(p["name"] if isinstance(p["name"], str) else next(iter(p["name"].values()))): p["id"] for p in yaml.safe_load(open(f"{base}/map.yaml"))["places"]}
species = {norm(s["name"]): s["id"] for s in json.load(open(f"{base}/generated/pokeapi.species.json"))["species"]}
truth = {(r["method"], r["species"], r["place"]) for r in yaml.safe_load(open(f"{base}/one-time.yaml")) if r["method"] != "roaming"}
got = {(c["kind"], species.get(norm(c["name"]), c["name"]), places.get(norm(p), p)) for c in o["oneTime"] for p in c["places"]}
print(f"one-time rows (not roaming): truth {len(truth)}, ROM {len(got)}, matched {len(truth & got)}")
print("  missing:", sorted(truth - got))
print("  extra:", sorted(got - truth))
