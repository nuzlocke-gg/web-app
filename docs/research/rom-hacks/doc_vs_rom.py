# Seaglass: the location table of the hack's documentation vs the ROM's wild tables.
#   python3 -I doc_vs_rom.py <doc-table.txt> <seaglass out.json> [<emerald out.json>]
import json, re, sys
text = open(sys.argv[1]).read().replace("\\_", "_").replace("\\#", "#")
out = json.load(open(sys.argv[2]))
TYPES = "Normal Fighting Flying Poison Ground Rock Bug Ghost Steel Fire Water Grass Electric Psychic Ice Dragon Dark Fairy".split()

# Rows whose lines the PDF text extraction scrambled, from the document as read.
FIXED = {
    "Golbat": "Wild: Meteor Falls, Shoal Cave Ice Room, Seafloor Cavern, Victory Road 1F/B1F/B2F, Cave of Origin, Sky Pillar",
    "Horsea": "Fish: 106 (OR), 115 (GR). Surf: 115, 124. Pacifidlog Scuba Safari",
    "Qwilfish": "Fish: 119 (SR). Surf: 132, 133, 134. Pacifidlog Scuba Safari",
}
rows = {}
lines = [l.strip() for l in text.splitlines()]
for name, loc in FIXED.items(): rows[name] = loc
cur = None
after_fixed = False  # a scrambled row's last line ("Pacifidlog Scuba Safari") follows it
for l in lines:
    if not l or l.startswith("#"): continue
    if after_fixed:
        after_fixed = False
        if not re.match(r"^\d+ ", l): continue
    if re.search(r"\b(Golbat|Horsea|Qwilfish)\b", l) and not l.startswith(("182 ", "42 ")): after_fixed = "Horsea" in l or "Qwilfish" in l
    m = re.match(r"^(?:\d+ )?([A-Z][\w'.\-]*)((?: (?:%s))+) ?(.*)$" % "|".join(TYPES), l)
    if m and m.group(1) not in TYPES and m.group(1) not in FIXED and not l.startswith(("Wild", "Fish", "Surf", "Most", "Rock")):
        cur = m.group(1); rows[cur] = m.group(3)
    elif cur and cur not in FIXED and not re.search(r"\b(Golbat|Horsea|Qwilfish)\b", l):
        rows[cur] = (rows[cur] + " " + l).strip()
print("doc rows parsed:", len(rows))

PLACE = [  # doc wording -> ROM place name (first match wins)
    (r"^(\d+)$", lambda m: f"ROUTE {m.group(1)}"),
    (r"^Granite Cave", "GRANITE CAVE"), (r"^Mt Pyre", "MT. PYRE"), (r"^Safari Zone", "SAFARI ZONE"), (r"^Meteor Falls", "METEOR FALLS"),
    (r"^Shoal Cave", "SHOAL CAVE"), (r"^Mt\. Pyre", "MT. PYRE"), (r"^Victory Road", "VICTORY ROAD"),
    (r"^Sky Pillar", "SKY PILLAR"), (r"^Underwater", "UNDERWATER"), (r"^(Rusturf|Rustboro) Tunnel", "RUSTURF TUNNEL"), (r"^Petalburg Woods", "PETALBURG WOODS"),
    (r"^Seafloor Cavern", "SEAFLOOR CAVERN"), (r"^Cave of Origin", "CAVE OF ORIGIN"), (r"^Ever Grande", "EVER GRANDE CITY"),
    (r"^(Littleroot)", "LITTLEROOT TOWN"), (r"^(Dewford)", "DEWFORD TOWN"), (r"^(Pacifidlog)$", "PACIFIDLOG TOWN"),
    (r"^(Rustboro)$", "RUSTBORO CITY"), (r"^(Petalburg)$", "PETALBURG CITY"), (r"^(Slateport)$", "SLATEPORT CITY"),
    (r"^(Mossdeep)$", "MOSSDEEP CITY"), (r"^(Fortree)$", "FORTREE CITY"), (r"^(Lilycove)$", "LILYCOVE CITY"),
]
def place(s):
    s = s.strip().rstrip(".")
    for pat, rep in PLACE:
        m = re.match(pat, s)
        if m: return rep(m) if callable(rep) else rep
    return s.upper()
METHOD = {"wild": {"walk", "hidden"}, "surf": {"surf"}, "fish": {"fishing"}, "rock smash": {"rock-smash"}}
doc, vague = set(), {}
for sp, loc in rows.items():
    loc = loc.replace("Mt. Pyre", "Mt Pyre").replace("Dundunsparce", "Dudunsparce")
    loc = re.sub(r"\)\s*(\d)", r"), \1", loc)  # "107 (OR/GR) 109(GR)" lists two routes
    for clause in re.split(r"\.\s+|\.$", loc):
        clause = clause.strip()
        m = re.match(r"^(Wild|Surf|Fish|Rock Smash):\s*(.*)$", clause)
        if not m:
            if clause and not re.match(r"^(Evolve|Event|Story Event|Roaming|Restore Fossil|Weather Institute|Pacifidlog Scuba Safari)", clause):
                vague.setdefault(clause, []).append(sp)
            continue
        meth = m.group(1).lower()
        for item in re.split(r",\s*", m.group(2)):
            item = re.sub(r"\s*\((OR|GR|SR)(/(OR|GR|SR))*\)", "", item).strip()
            # "Wild: 102, 114, Surf 127, 128" or "Wild: X, Fish: Y" switch method mid-list
            mm = re.match(r"^(Surf|Fish):?\s+(.*)$", item)
            if mm: meth = mm.group(1).lower(); item = mm.group(2)
            if item.startswith("Most") or "Scuba" in item or not item: continue
            if "and many other" in item or item.startswith("and "): continue
            doc.add((sp, place(item), meth))

def norm(n): return re.sub(r"[^A-Z0-9]", "", n.upper().replace("♀", "F").replace("♂", "M").replace("É", "E").replace("DUNDUNSPARCE", "DUDUNSPARCE"))
rom = {}
for h in out["headers"]:
    if h["alternate"]: continue
    for t in h["tables"]:
        for m in t["mons"]:
            rom.setdefault((norm(m["name"]), h["place"]), set()).add(t["method"])
ok, missing = [], []
for sp, pl, meth in sorted(doc):
    got = rom.get((norm(sp), pl), set())
    want = METHOD[meth] | ({"surf"} if pl == "UNDERWATER" else set())
    (ok if got & want else missing).append((sp, pl, meth, sorted(got)))
print(f"documented (species, Place, method) claims: {len(doc)}; found in the ROM: {len(ok)}; not found: {len(missing)}")
for r in missing: print("  not in ROM:", r)
docsp = {(norm(sp), pl) for sp, pl, _ in doc}
extra = sorted({(k[0], k[1]) for k in rom} - docsp)
print(f"ROM (species, Place) pairs the doc's explicit claims do not mention: {len(extra)} of {len(rom)}")
print("  vague clauses skipped:", {k: len(v) for k, v in vague.items()})
vague_sp = {norm(sp) for v in vague.values() for sp in v} | {norm(sp) for sp, loc in rows.items() if "Scuba" in loc or "Most" in loc or "many other" in loc}
unexplained = [e for e in extra if e[0] not in vague_sp]
print(f"  of those, for species the doc never describes vaguely: {len(unexplained)}")
from collections import Counter
print("  by Place:", Counter(p for _, p in unexplained).most_common(12))
print("  by ROM method:", Counter(m for e in unexplained for m in rom[e]).most_common())
nonhidden = [e for e in unexplained if rom[e] != {"hidden"}]
print(f"  not hidden-only: {len(nonhidden)}:", [(e, sorted(rom[e])) for e in nonhidden])

# Scuba Safari: species the doc lists there vs the dive maps the ROM adds
# under Pacifidlog Town (maps the vanilla Emerald ROM does not have).
if len(sys.argv) > 3:
    vanilla = json.load(open(sys.argv[3]))
    vk = {tuple(h["map"]) for h in vanilla["headers"]}
    dive = {norm(m["name"]) for h in out["headers"] if tuple(h["map"]) not in vk and h["place"] == "PACIFIDLOG TOWN" for t in h["tables"] for m in t["mons"]}
    scuba = {norm(sp) for sp, loc in rows.items() if "Scuba Safari" in loc}
    print(f"Scuba Safari: doc lists {len(scuba)} species, the dive maps hold {len(dive)}; doc-only {sorted(scuba - dive)}, ROM-only {sorted(dive - scuba)}")
