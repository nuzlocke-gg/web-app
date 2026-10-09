# Grade the ROM extractor's output against the decomp's own source data.
#   python3 -I grade.py <extract.json> <decomp dir> [emerald|firered]
import json, sys, glob, re
out = json.load(open(sys.argv[1])); decomp = sys.argv[2]
GAME = sys.argv[3] if len(sys.argv) > 3 else "emerald"

maps = {}
for p in glob.glob(f"{decomp}/data/maps/*/map.json"):
    m = json.load(open(p)); maps[m["id"]] = m
# map ids in group order, as gMapGroups is built from map_groups.json
mg = json.load(open(f"{decomp}/data/maps/map_groups.json"))
gn = {}
for g, name in enumerate(mg["group_order"]):
    for n, mapname in enumerate(mg[name]):
        gn[(g, n)] = next(m["id"] for m in maps.values() if m["name"] == mapname)

def norm_const(c):  # SPECIES_NIDORAN_F -> NIDORANF
    return c.removeprefix("SPECIES_").replace("_", "")
def norm_name(n):
    return re.sub(r"[^A-Z0-9]", "", n.upper().replace("♀", "F").replace("♂", "M").replace("É", "E"))

FIELD = {"land_mons": "walk", "water_mons": "surf", "rock_smash_mons": "rock-smash", "fishing_mons": "fishing", "hidden_mons": "hidden"}
TIMES = ["Morning", "Day", "Evening", "Night"]
src = {}  # (map, time) -> {method: (rate, [(species, min, max)])}
for grp in json.load(open(f"{decomp}/src/data/wild_encounters.json"))["wild_encounter_groups"]:
    if grp["label"] != "gWildMonHeaders": continue
    for e in grp["encounters"]:
        # FRLG tables carry a game suffix; a build has only its own game's
        if GAME == "emerald" and re.search(r"_(FireRed|LeafGreen)$", e["base_label"]): continue
        if GAME == "firered" and e["base_label"].endswith("_LeafGreen"): continue
        t = next((i for i, s in enumerate(TIMES) if e["base_label"].endswith("_" + s)), 0)
        key = (e["map"], t)
        if key in src: continue  # alternates (Altering Cave): first one is the header the scan keeps first
        src[key] = {FIELD[k]: (v["encounter_rate"], [(norm_const(m["species"]), m["min_level"], m["max_level"]) for m in v["mons"]])
                    for k, v in e.items() if k in FIELD}

got = {}
for h in out["headers"]:
    if h["alternate"]: continue
    mid = gn[tuple(h["map"])]
    for t in h["tables"]:
        got.setdefault((mid, t.get("time") or 0), {})[t["method"]] = (t["rate"], [(norm_name(m["name"]), m["min"], m["max"]) for m in t["mons"]])

def same_species(a, b):  # a form constant (RATTATA_ALOLA) carries its species name (Rattata)
    return a == b or a.startswith(b)
ok = bad = 0
notbuilt = set()
for key in sorted(src.keys() | got.keys()):
    a, b = src.get(key), got.get(key)
    if a is None or b is None or a.keys() != b.keys() or any(
        a[k][0] != b[k][0] or len(a[k][1]) != len(b[k][1]) or
        any(x[1:] != y[1:] or not same_species(x[0], y[0]) for x, y in zip(a[k][1], b[k][1])) for k in a):
        if b is None and key[0] not in gn.values():
            notbuilt.add(key[0]); continue  # in the JSON, but not a map of this build
        bad += 1
        if bad <= 5: print("MISMATCH", key, "\n  decomp:", a, "\n  rom:   ", b)
    else: ok += 1
print(f"skipped: {len(notbuilt)} JSON maps that are not maps of this build, e.g. {sorted(notbuilt)[:3]}")
print(f"headers x times compared: {ok + bad}; identical: {ok}; mismatched: {bad}")
alts = sum(h["alternate"] for h in out["headers"])
print(f"alternate headers kept aside: {alts}")

# Place names: each header's map section name vs the decomp's map.json + section names
import os
secfile = next(p for p in [f"{decomp}/src/data/region_map/region_map_sections.json"] if os.path.exists(p))
secname = {s["id"]: s.get("name") or s.get("name_clone") or "" for s in json.load(open(secfile))["map_sections"]}
def pn(n): return re.sub(r"[^A-Z0-9]", "", (n or "").upper().replace("É", "E"))
pbad = 0; pok = 0
for h in out["headers"]:
    m = maps[gn[tuple(h["map"])]]
    want = secname.get(m["region_map_section"], "")
    if pn(want) == pn(h["place"]): pok += 1
    else:
        pbad += 1
        if pbad <= 5: print("PLACE MISMATCH", m["id"], m["region_map_section"], repr(want), "rom:", repr(h["place"]))
print(f"place names: {pok} right, {pbad} wrong")
