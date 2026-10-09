# Species identity: wild species ids + ROM names vs PokeAPI's national dex.
import csv, json, re, sys
o = json.load(open(sys.argv[1])); api = sys.argv[2]
names = {r["pokemon_species_id"]: r["name"] for r in csv.DictReader(open(f"{api}/pokemon_species_names.csv")) if r["local_language_id"] == "9"}
ident = {int(r["id"]): r["identifier"] for r in csv.DictReader(open(f"{api}/pokemon_species.csv"))}
def norm(n): return re.sub(r"[^A-Z0-9]", "", (n or "").upper().replace("♀", "F").replace("♂", "M").replace("É", "E"))
dex_by_name = {norm(names[str(i)]): i for i in ident}
used = {}
for h in o["headers"] + [h for t in o["extraTables"] for h in t["headers"]]:
    for t in h["tables"]:
        for m in t["mons"]:
            used[m["species"]] = m["name"]
base = {i: n for i, n in used.items() if i <= 1025}
forms = {i: n for i, n in used.items() if i > 1025}
ok = [i for i, n in base.items() if dex_by_name.get(norm(n)) == i]
bad = [(i, n, ident.get(i)) for i, n in base.items() if dex_by_name.get(norm(n)) != i]
print(f"species ids in wild tables: {len(used)}; base (id = dex) {len(base)}, name agrees with dex for {len(ok)}")
print("  disagreements:", bad)
print("  ids past the dex (Forms):", sorted((i, n, ident.get(dex_by_name.get(norm(n)))) for i, n in forms.items()))
gens = {}
for i in base: gens[1 if i<=151 else 2 if i<=251 else 3 if i<=386 else 4 if i<=493 else 5 if i<=649 else 6 if i<=721 else 7 if i<=809 else 8 if i<=905 else 9] = gens.get(1 if i<=151 else 2 if i<=251 else 3 if i<=386 else 4 if i<=493 else 5 if i<=649 else 6 if i<=721 else 7 if i<=809 else 8 if i<=905 else 9, 0) + 1
print("  base species by generation:", dict(sorted(gens.items())))
