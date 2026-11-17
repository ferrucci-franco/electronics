"""Prépare un schéma Inkscape à calques pour le simulateur.

Chaque calque Inkscape devient un groupe adressable par son nom : le fichier
produit n'affiche rien seul, mais `fichier.svg#c` n'affiche que le calque « C ».
Le simulateur superpose ainsi plusieurs <img> du même fichier, qui partagent
exactement le même cadre (la page Inkscape) : aucun composant ne bouge quand on
en allume ou en éteint un autre. La technique (:target dans un SVG chargé par
<img>) fonctionne en file://, sans serveur.

Nom du calque → identifiant : minuscules, tout caractère hors [a-z0-9] devient
« - » (« load_RL » → « load-rl », « Lf-cable » → « lf-cable »).

Usage :
    python power-converters/tools/empiler-calques-svg.py SOURCE.svg DESTINATION.svg
"""

import re
import sys
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
INKSCAPE = "http://www.inkscape.org/namespaces/inkscape"
SODIPODI = "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"


def slug(label):
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


def clean(element):
    """Retire les attributs propres à Inkscape, récursivement."""
    for key in list(element.attrib):
        if key.startswith("{" + INKSCAPE + "}") or key.startswith("{" + SODIPODI + "}"):
            del element.attrib[key]
    for child in element:
        clean(child)


def main(source, destination):
    ET.register_namespace("", SVG)
    tree = ET.parse(source)
    root = tree.getroot()

    for child in list(root):
        if child.tag in ("{%s}namedview" % SODIPODI, "{%s}metadata" % SVG):
            root.remove(child)

    layers = []
    for group in root.findall("{%s}g" % SVG):
        if group.get("{%s}groupmode" % INKSCAPE) != "layer":
            continue
        name = slug(group.get("{%s}label" % INKSCAPE, group.get("id", "")))
        if name in layers:
            sys.exit(f"Deux calques donnent le même identifiant : « {name} »")
        layers.append(name)
        group.set("id", name)
        # La visibilité est pilotée par :target, pas par l'état du calque dans Inkscape.
        style = re.sub(r"display\s*:\s*[a-z]+\s*;?", "", group.get("style", "")).strip("; ")
        if style:
            group.set("style", style)
        elif "style" in group.attrib:
            del group.attrib["style"]

    clean(root)
    for key in ("width", "height"):
        root.attrib.pop(key, None)  # le cadre suit le conteneur, le viewBox fixe les proportions

    css = ET.Element("{%s}style" % SVG)
    css.text = "svg > g { display: none; } svg > g:target { display: inline; }"
    root.insert(0, css)

    with open(destination, "w", encoding="utf-8", newline="\n") as handle:
        handle.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        handle.write(f"<!-- Généré par tools/empiler-calques-svg.py depuis {source.replace(chr(92), '/')} : ne pas éditer ici. -->\n")
        tree.write(handle, encoding="unicode")
        handle.write("\n")
    print(f"{destination} : {len(layers)} calques : " + ", ".join(layers))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
