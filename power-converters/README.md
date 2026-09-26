# Simulateur de convertisseurs

Application HTML/JavaScript autonome pour la classe.

## Ouvrir

Double-cliquez sur `index.html`. Aucune installation et aucun serveur ne sont nécessaires.

La vérification numérique du modèle à thyristors se lance avec `node tests/thyristor.test.js`.

L’application comprend :

- `index.html`
- `styles.css` et `pv.css`
- `app.js`
- `topologies/` pour les modèles Buck, Boost, pont en H, redresseurs et PV → réseau
- `assets/` pour les schémas SVG ; ceux du redresseur et de la commande de puissance sont générés par calques à partir des dessins Inkscape de `app/` (`tools/empiler-calques-svg.py`, voir `CLAUDE.md`)
- `vendor/` pour KaTeX, utilisable sans connexion Internet

Notation : minuscule pour une grandeur instantanée (v_o, i_L, v_x), majuscule pour une constante, une moyenne ou une valeur efficace (V_in continue, V_o = ⟨v_o⟩) ; le rapport cyclique est noté α. Le sélecteur de circuit est le bouton du titre, en haut à gauche.

Le Buck et le Boost sont synchrones par défaut. Le mode avancé permet de choisir la commutation synchrone ou une réalisation avec interrupteur et diode ; cette dernière prend en compte les régimes CCM et DCM.

Le pont en H propose trois applications :

- onduleur monophasé à PWM bipolaire ou unipolaire, filtre LC et charge R–L ;
- moteur CC commandé manuellement, sans régulateur PI, soit autour de 50 % (50 % = arrêt), soit par sens et roue libre à tension nulle, avec affichage du démarrage ou de huit périodes PWM en régime permanent ;
- injection de courant dans un réseau rigide de 50 Hz à travers une inductance, avec réglage du courant efficace et de sa phase, puis calcul de P, Q, du facteur de puissance et de la THD.

Le mode avancé affiche les trois sous-graphes et les paramètres complémentaires. Les légendes sont cliquables pour masquer ou réafficher chaque trace.

Dans l’oscilloscope, faites glisser avec le bouton gauche horizontalement, verticalement ou en diagonale pour zoomer sur le temps, sur l’axe vertical du sous-graphe choisi, ou sur les deux axes. Faites glisser avec le bouton droit pour déplacer la vue agrandie. Un double-clic ou un double toucher rétablit la vue complète.

Dans l’application réseau du pont en H, la commande du courant peut utiliser une PWM à fréquence fixe ou un comparateur à hystérésis. Dans ce second cas, la demi-bande est réglable et la fréquence de commutation devient variable.

## Publication (GitHub Pages)

Copie publique : https://ferrucci-franco.github.io/electronics/power-converters/ (dépôt public `ferrucci-franco/electronics`, dossier `power-converters/`). On modifie toujours ici, on committe, puis, depuis la racine du dépôt :

    node tools/publier-simulateur.js            # tests, copie, carte de l’index, commit, push
    node tools/publier-simulateur.js --essai    # montre ce qui changerait, sans rien écrire

Seuls les fichiers versionnés de ce dossier sont publiés (pas `OUVRIR.md`), dans leur version committée ; la copie publiée reçoit le compteur de visites GoatCounter commun au site. Le script travaille dans un clone dédié (`C:/Users/ferrucci/repos/electronics-power-converters-publish`, créé au besoin) et s’arrête si la source n’est pas committée, si un test échoue ou si le clone est modifié.

## Topologie « Redresseur à diodes »

Redresseur AC-DC classique alimenté par une source sinusoïdale réglable (50 ou 60 Hz) : simple diode (monoalternance) ou pont de Graetz (double alternance, paires D1–D3 et D2–D4), filtre L–C (inductance de lissage L_f côté continu, puis condensateur en parallèle) et charge R–L série. Le mode simple ne propose que V_in, R et C ; L_f et l’inductance de charge L n’apparaissent qu’en mode avancé (et valent zéro en mode simple). Un curseur de filtre à zéro retire l’élément : la branche s’estompe dans le schéma. Le filtre à entrée inductive illustre le compromis classique : sans L_f le condensateur se recharge par pointes (tension proche de V̂ mais facteur de puissance dégradé) ; avec L_f suffisante la conduction devient continue, la tension moyenne rejoint 2V̂/π et le facteur de puissance remonte vers 0,9.

Les valeurs moyennes de v_o et i_o sont rappelées sur le bord droit de l’oscilloscope et le bandeau compare la tension moyenne simulée à la formule idéale V̂/π ou 2V̂/π. Les courants tracés suivent la loi des nœuds au condensateur : i_in et i_o en mode simple, plus i_C en mode avancé. Le mode avancé ajoute la tension v_x en sortie du redresseur (avant L_f, tracée si L_f > 0), la tension de la diode D1 (lecture de la tension inverse de crête), les courants côté alternatif (i_in et les courants des paires de diodes, avec les pointes de recharge du condensateur), le choix entre diodes idéales et diodes à chute de 0,6 V, ainsi qu’une vue « Démarrage » avec angle d’enclenchement réglable pour observer le régime transitoire, dont l’appel de courant du condensateur. En régime permanent, source et diodes sont idéales : pendant la conduction, v_o suit exactement v_in redressée. La vue « Démarrage » ajoute une résistance R_in de 0,5 Ω côté source, qui limite l’appel de courant du condensateur déchargé.

## Topologie « Commande de puissance »

Commande de puissance par angle de phase alimentant une charge R–L série : le SCR peut conduire une seule alternance, tandis que le TRIAC peut conduire les deux. L’angle d’amorçage α se règle de 0° à 170° et se mesure depuis chaque passage par zéro de la sinusoïde. Le modèle conserve automatiquement la conduction jusqu’à l’annulation naturelle du courant de charge.

La source représente le réseau : sa tension efficace se choisit entre 110 V et 230 V, à côté de la fréquence 50/60 Hz. Le mode avancé ajoute les tensions et courants détaillés des composants et les impulsions de gâchette. Les deux modes affichent également les courbes de puissance active et de tension efficace de charge en fonction de α, avec le point de fonctionnement courant superposé. La fenêtre d’analyse donne directement la loi de V_o,eff(α) pour une charge résistive idéale ; la simulation numérique ajoute l’effet de L et présente aussi les puissances, le facteur de puissance et la THD du courant absorbé.

## Topologie « Solaire PV → réseau »

Chaîne photovoltaïque complète : champ PV, boost MPPT, bus continu et pont en H qui injecte un courant sinusoïdal dans le réseau 230 V / 50 Hz.

La scène solaire est interactive :

- faites glisser le soleil le long de sa trajectoire est-ouest (l’éclairement suit la hauteur du soleil via la masse d’air et l’angle d’incidence) ;
- faites glisser les nuages, ou réglez la nébulosité avec le curseur : un nuage placé devant le soleil occulte le faisceau direct ;
- le bouton « Faire défiler la journée » anime le passage du soleil ;
- l’inclinaison du panneau se règle au curseur ou en faisant glisser le panneau lui-même ; la température ambiante et la taille du champ (panneaux par string, strings en parallèle) se règlent par les curseurs.

Les courbes I–V et P–V du champ sont tracées en direct (la référence STC reste en pointillé). En mode MPPT le point de fonctionnement suit le point de puissance maximale ; en mode manuel, faites-le glisser le long de la courbe pour visualiser la puissance perdue hors du MPP.

Le modèle électrique est simulé en commutation : rapport cyclique du boost imposant la tension PV, ondulation à 100 Hz du bus continu (liaison monophasée), PWM unipolaire du pont et suivi de courant avec régulation douce du bus. Le mode avancé ajoute les courants détaillés (i_pv, courant de bus moyenné, et sa version hachée masquée par défaut dans la légende), ainsi que la tension du bus et la fréquence de découpage du boost réglables.
