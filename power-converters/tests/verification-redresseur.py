#!/usr/bin/env python3
"""Vérification indépendante du redresseur à diodes du simulateur.

Ce script ne réutilise aucune ligne de l'application : il refait la simulation
par intégration temporelle, avec sa propre formulation (décroissance exacte du
condensateur entre deux conductions), puis il compare ses résultats à ceux que
l'application affiche dans le panneau « Régime permanent ».

Les valeurs de l'application sont obtenues en lançant `node
tests/redresseur-valeurs.js`, qui appelle le modèle `topologies/redresseur.js`
et imprime ses résultats en JSON. Tout écart supérieur à 1 % entre les deux
simulations est signalé comme un défaut (code de sortie 1).

    python tests/verification-redresseur.py            # tableau complet
    python tests/verification-redresseur.py --sans-app # simulation seule

Cas vérifiés : simple alternance et pont, diodes idéales et à seuil de 0,6 V,
sans condensateur et avec les condensateurs du TP (1 kHz) et du réseau (50 Hz).
"""

import json
import math
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent
TOLERANCE = 1e-2  # 1 %

# Paramètres des deux familles de cas : (nom, V̂, f, R, [C en nanofarads…]).
FAMILLES = [
    ("TP au générateur", 10.0, 1000.0, 10e3, [0, 100, 1000]),
    ("Réseau", 17.0, 50.0, 100.0, [0, 1000000]),
]
MONTAGES = ["simple", "pont"]
SEUILS = [0.0, 0.6]


def nombre_de_diodes(montage):
    """Nombre de diodes en série dans le chemin de conduction."""
    return 2 if montage == "pont" else 1


def seuil_de_conduction(frequence):
    """Seuil de courant qui compte comme conduction (convention de l'application)."""
    return 1e-6 if frequence == 1000.0 else 1e-3


def simule(amplitude, frequence, resistance, capacite, montage, vd0, pas_par_periode=10000):
    """Intègre le circuit jusqu'au régime permanent et mesure une période.

    Formulation : le condensateur suit la tension redressée tant que celle-ci
    est supérieure à sa propre tension (diode passante) ; sinon il se décharge
    dans R selon l'exponentielle exacte sur un pas. Sans condensateur, la
    tension de sortie est algébrique.
    """
    omega = 2 * math.pi * frequence
    periode = 1 / frequence
    dt = periode / pas_par_periode
    chute = nombre_de_diodes(montage) * vd0
    pont = montage == "pont"

    def source(temps):
        return amplitude * math.sin(omega * temps)

    def redressee(temps):
        brute = source(temps)
        return (abs(brute) if pont else brute) - chute

    def pente_redressee(temps):
        """d(v_redressée)/dt : la valeur absolue change le signe de la dérivée."""
        brute = math.sin(omega * temps)
        signe = (1.0 if brute >= 0 else -1.0) if pont else 1.0
        return signe * amplitude * omega * math.cos(omega * temps)

    echantillons = []
    if capacite <= 0:
        for indice in range(pas_par_periode):
            temps = indice * dt
            vo = max(0.0, redressee(temps))
            io = vo / resistance
            echantillons.append((source(temps), vo, io, io, io > 0))
    else:
        decroissance = math.exp(-dt / (resistance * capacite))
        vc = 0.0
        # Assez de périodes pour éteindre le transitoire (quelques RC), avec
        # sortie anticipée dès que la période se répète.
        periodes = min(4000, max(60, int(30 * resistance * capacite * frequence)))
        for periode_index in range(periodes):
            depart = vc
            for indice in range(pas_par_periode):
                temps = indice * dt
                libre = vc * decroissance
                vrect = redressee(temps)
                vc = vrect if vrect > libre else libre
            if periode_index > 3 and abs(vc - depart) < 1e-12 * max(1.0, amplitude):
                break
        for indice in range(pas_par_periode):
            temps = indice * dt
            libre = vc * decroissance
            vrect = redressee(temps)
            passante = vrect > libre
            vc = vrect if passante else libre
            io = vc / resistance
            # i_D = C·dv_o/dt + i_o pendant la conduction, nul sinon.
            idiode = capacite * pente_redressee(temps) + io if passante else 0.0
            echantillons.append((source(temps), vc, io, max(0.0, idiode), passante))

    seuil = seuil_de_conduction(frequence)
    vin = [point[0] for point in echantillons]
    vo = [point[1] for point in echantillons]
    io = [point[2] for point in echantillons]
    idiode = [point[3] for point in echantillons]
    passante = [point[4] for point in echantillons]
    nombre = len(echantillons)

    # Tension inverse de la diode D1 : loi des mailles. En simple alternance,
    # v_D = v_in − v_o quand elle est bloquée ; dans le pont, les deux diodes
    # bloquées se partagent (v_in − v_o), et la paire opposée passante impose
    # −(v_o + V_D0).
    inverses = []
    for index in range(nombre):
        if pont:
            if passante[index]:
                vd = vd0 if vin[index] >= 0 else -(vo[index] + vd0)
            else:
                vd = (vin[index] - vo[index]) / 2
        else:
            vd = vd0 if passante[index] else vin[index] - vo[index]
        inverses.append(-vd)

    io_moyen = sum(io) / nombre
    io_efficace = math.sqrt(sum(valeur ** 2 for valeur in io) / nombre)
    # Angle de conduction et courant de crête d'UNE diode (la paire D1–D3 dans
    # le pont) : c'est ce que l'application mesure.
    courants_d1 = [valeur if (not pont or vin[index] >= 0) else 0.0
                   for index, valeur in enumerate(idiode)]
    conduction = sum(1 for valeur in courants_d1 if valeur > seuil) / nombre * 360
    return {
        "voMax": max(vo),
        "voMoyen": sum(vo) / nombre,
        "ondulation": max(vo) - min(vo),
        "ioMoyen": io_moyen,
        "ioEfficace": io_efficace,
        "facteurDeForme": io_efficace / io_moyen if io_moyen > 1e-15 else None,
        "angleDeConduction": conduction,
        "tensionInverse": max(inverses),
        "courantDeCrete": max(courants_d1),
    }


def formules(amplitude, frequence, resistance, capacite, montage, vd0):
    """Valeurs analytiques du panneau, calculées indépendamment de l'application."""
    diodes = nombre_de_diodes(montage)
    chute = diodes * vd0
    vo_max = amplitude - chute
    if montage == "pont":
        moyenne = 2 * amplitude / math.pi - 2 * vd0
        inverse_sans_c = amplitude - vd0
        inverse_avec_c = amplitude - vd0
    else:
        moyenne = amplitude / math.pi - vd0 / 2
        inverse_sans_c = amplitude
        inverse_avec_c = 2 * amplitude - vd0
    frequence_ondulation = (2 if montage == "pont" else 1) * frequence
    ondulation = None
    moyenne_avec_c = None
    if capacite > 0:
        ondulation = (vo_max / resistance) / (frequence_ondulation * capacite)
        # La sortie oscille entre v_o max et v_o max − Δv_o : moyenne à mi-ondulation.
        moyenne_avec_c = vo_max - ondulation / 2
    # Moyenne exacte (intégrale), pour mesurer l'erreur propre du développement
    # au premier ordre en V_D0 ; elle ne sert pas de critère.
    if chute < amplitude:
        theta = math.asin(chute / amplitude)
        if montage == "pont":
            exacte = (2 * amplitude * math.cos(theta) - chute * (math.pi - 2 * theta)) / math.pi
        else:
            exacte = (2 * amplitude * math.cos(theta) - chute * (math.pi - 2 * theta)) / (2 * math.pi)
    else:
        exacte = 0.0
    return {
        "voMaxFormule": vo_max,
        "voMoyenFormule": moyenne,
        "voMoyenExacte": exacte,
        "tensionInverseFormule": inverse_avec_c if capacite > 0 else inverse_sans_c,
        "ondulationFormule": ondulation,
        "moyenneAvecCFormule": moyenne_avec_c,
        "frequenceOndulation": frequence_ondulation,
        "hypotheseRC": capacite > 0 and resistance * capacite >= 5 / frequence_ondulation,
    }


def valeurs_de_l_application():
    """Résultats du modèle de l'application, via Node."""
    sortie = subprocess.run(
        ["node", str(RACINE / "redresseur-valeurs.js")],
        capture_output=True, text=True, check=True,
    ).stdout
    return {entree["cle"]: entree for entree in json.loads(sortie)}


def cle(montage, vd0, amplitude, frequence, resistance, nanofarads):
    """Clé partagée avec tests/redresseur-valeurs.js (capacité en nanofarads)."""
    return "|".join([montage, f"{vd0:g}", f"{amplitude:g}", f"{frequence:.0f}",
                     f"{resistance:.0f}", f"{nanofarads:.0f}"])


def francais(valeur, unite="", decimales=3):
    if valeur is None:
        return "—"
    texte = f"{valeur:.{decimales}f}".replace(".", ",")
    return f"{texte} {unite}" if unite else texte


def main():
    sans_app = "--sans-app" in sys.argv
    application = {} if sans_app else valeurs_de_l_application()
    comparaisons = [
        ("v_o max", "voMax", "V"),
        ("⟨v_o⟩", "voMoyen", "V"),
        ("Δv_o", "ondulation", "V"),
        ("⟨i_o⟩", "ioMoyen", "A"),
        ("I_o,eff", "ioEfficace", "A"),
        ("Facteur de forme", "facteurDeForme", ""),
        ("Angle de conduction", "angleDeConduction", "°"),
        ("Tension inverse de crête", "tensionInverse", "V"),
        ("Courant de crête (diode)", "courantDeCrete", "A"),
    ]
    defauts = []
    for nom_famille, amplitude, frequence, resistance, capacites in FAMILLES:
        for nanofarads in capacites:
            capacite = nanofarads / 1e9
            for montage in MONTAGES:
                for vd0 in SEUILS:
                    mesure = simule(amplitude, frequence, resistance, capacite, montage, vd0)
                    formule = formules(amplitude, frequence, resistance, capacite, montage, vd0)
                    identifiant = cle(montage, vd0, amplitude, frequence, resistance, nanofarads)
                    print(f"\n── {nom_famille} · {montage} · V_D0 = {francais(vd0, 'V', 1)}"
                          f" · V̂ = {francais(amplitude, 'V', 1)} · f = {francais(frequence, 'Hz', 0)}"
                          f" · R = {francais(resistance, 'Ω', 0)} · C = {francais(capacite * 1e9, 'nF', 0)}")
                    print(f"   formules : v_o max {francais(formule['voMaxFormule'], 'V')}"
                          f" · ⟨v_o⟩ {francais(formule['voMoyenFormule'], 'V')}"
                          f" (exacte {francais(formule['voMoyenExacte'], 'V')})"
                          f" · V_inv {francais(formule['tensionInverseFormule'], 'V')}"
                          f" · Δv_o {francais(formule['ondulationFormule'], 'V')}"
                          f" · RC ≫ 1/f_r : {'oui' if formule['hypotheseRC'] else 'non'}")
                    reference = application.get(identifiant)
                    if reference is None:
                        for etiquette, champ, unite in comparaisons:
                            print(f"   {etiquette:<26} script {francais(mesure[champ], unite):>14}")
                        continue
                    for etiquette, champ, unite in comparaisons:
                        attendu = mesure[champ]
                        obtenu = reference["simulation"].get(champ)
                        if attendu is None or obtenu is None:
                            print(f"   {etiquette:<26} —")
                            continue
                        base = max(abs(attendu), 1e-9)
                        ecart = abs(obtenu - attendu) / base
                        marque = "✗" if ecart > TOLERANCE else " "
                        print(f"   {etiquette:<26} script {francais(attendu, unite):>14}"
                              f"   app {francais(obtenu, unite):>14}   écart {ecart * 100:6.3f} % {marque}")
                        if ecart > TOLERANCE:
                            defauts.append((identifiant, etiquette, attendu, obtenu, ecart))
                    # Valeurs analytiques affichées par le panneau.
                    for etiquette, champ_script, champ_app in [
                        ("formule v_o max", "voMaxFormule", "voMaxFormule"),
                        ("formule ⟨v_o⟩", "voMoyenFormule", "voMoyenFormule"),
                        ("formule V_inv", "tensionInverseFormule", "tensionInverseFormule"),
                        ("formule Δv_o", "ondulationFormule", "ondulationFormule"),
                        ("formule ⟨v_o⟩ avec C", "moyenneAvecCFormule", "moyenneAvecCFormule"),
                    ]:
                        attendu = formule[champ_script]
                        obtenu = reference["formules"].get(champ_app)
                        if attendu is None and obtenu is None:
                            continue
                        if attendu is None or obtenu is None:
                            defauts.append((identifiant, etiquette, attendu, obtenu, float("inf")))
                            print(f"   {etiquette:<26} script {francais(attendu, 'V'):>14}   app {francais(obtenu, 'V'):>14}   ✗")
                            continue
                        ecart = abs(obtenu - attendu) / max(abs(attendu), 1e-9)
                        marque = "✗" if ecart > TOLERANCE else " "
                        print(f"   {etiquette:<26} script {francais(attendu, 'V'):>14}"
                              f"   app {francais(obtenu, 'V'):>14}   écart {ecart * 100:6.3f} % {marque}")
                        if ecart > TOLERANCE:
                            defauts.append((identifiant, etiquette, attendu, obtenu, ecart))
                    if reference["formules"].get("hypotheseRC") not in (None, formule["hypotheseRC"]):
                        defauts.append((identifiant, "hypothèse RC", formule["hypotheseRC"],
                                        reference["formules"]["hypotheseRC"], float("inf")))

    print()
    if sans_app:
        print("Simulation seule : aucune comparaison demandée.")
        return 0
    if defauts:
        print(f"✗ {len(defauts)} écart(s) supérieur(s) à {TOLERANCE * 100:g} % :")
        for identifiant, etiquette, attendu, obtenu, ecart in defauts:
            print(f"   {identifiant} · {etiquette} : script {attendu}, app {obtenu} ({ecart * 100:.3f} %)")
        return 1
    print(f"✓ application et script d'accord à mieux que {TOLERANCE * 100:g} % sur tous les cas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
