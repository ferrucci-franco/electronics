# Simulateur de convertisseurs

Application HTML/JavaScript autonome pour la classe.

## Ouvrir

Double-cliquez sur `index.html`. Aucune installation et aucun serveur ne sont nécessaires.

Les vérifications numériques se lancent à la main, un script par topologie : `node tests/thyristor.test.js`, `node tests/redresseur.test.js`, `node tests/pont-h.test.js`.

Le redresseur dispose en plus d’une vérification croisée indépendante, qui refait la simulation en Python (sans réutiliser le code de l’application) et compare les quatre cas du panneau « Régime permanent » aux valeurs du modèle, pour les diodes idéales et le modèle 0,6 V : `python tests/verification-redresseur.py` (elle appelle `node tests/redresseur-valeurs.js`, qui imprime les valeurs de l’application en JSON ; `--sans-app` montre la simulation seule). Tout écart supérieur à 1 % sort en erreur.

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

- onduleur monophasé à PWM bipolaire ou unipolaire, sous deux montages :
  - **pont + LC** : filtre LC et charge R–L série, dont R_o et L_o se règlent en mode avancé (L_o = 0 donne une charge purement résistive) ;
  - **générateur + RC** : le montage de TP, où la MLI sinusoïdale sort d’un générateur de fonctions (±V_in à vide, résistance interne R_g = 50 Ω) et attaque un filtre RC passe-bas (R en kΩ, C en µF), la sortie v_o étant relevée à vide à l’oscilloscope ; le bandeau donne f_c = 1/(2π(R_g+R)C), le fondamental et son déphasage ;
  - **générateur + LC** : même générateur (R_g = 50 Ω), bobine L_f avec sa résistance de bobinage R_L (mode avancé), condensateur C_f et charge R_o en kΩ ; R_g et R_L amortissent la résonance, et la valeur attendue du fondamental est |H(jω₁)|·mV_in/√2 ;
- moteur CC commandé manuellement, sans régulateur PI, soit autour de 50 % (50 % = arrêt), soit par sens et roue libre à tension nulle, avec affichage du démarrage ou de huit périodes PWM en régime permanent ;
- injection de courant dans un réseau rigide de 50 Hz à travers une inductance, avec réglage du courant efficace et de sa phase, puis calcul de P, Q, du facteur de puissance et de la THD.

Le mode avancé affiche les trois sous-graphes et les paramètres complémentaires. Les légendes sont cliquables pour masquer ou réafficher chaque trace.

Dans l’oscilloscope, faites glisser avec le bouton gauche horizontalement, verticalement ou en diagonale pour zoomer sur le temps, sur l’axe vertical du sous-graphe choisi, ou sur les deux axes. Faites glisser avec le bouton droit pour déplacer la vue agrandie. Un double-clic ou un double toucher rétablit la vue complète. Sur écran tactile, un doigt fait défiler la page : on zoome sur le temps en glissant horizontalement, ou sur n’importe quel axe après un appui long (≈ 0,35 s) suivi d’un glissement. Dans la scène PV, la page défile aussi, sauf si le doigt se pose sur le soleil, un nuage ou le panneau ; dans les courbes I–V et P–V, un toucher choisit la tension et le point de fonctionnement se fait glisser.

Dans l’application réseau du pont en H, la commande du courant peut utiliser une PWM à fréquence fixe ou un comparateur à hystérésis. Dans ce second cas, la demi-bande est réglable et la fréquence de commutation devient variable.

## Publication (GitHub Pages)

Copie publique : https://ferrucci-franco.github.io/electronics/power-converters/ (dépôt public `ferrucci-franco/electronics`, dossier `power-converters/`). On modifie toujours ici, on committe, puis, depuis la racine du dépôt :

    node tools/publier-simulateur.js            # tests, copie, carte de l’index, commit, push
    node tools/publier-simulateur.js --essai    # montre ce qui changerait, sans rien écrire

Seuls les fichiers versionnés de ce dossier sont publiés (pas `OUVRIR.md`), dans leur version committée ; la copie publiée reçoit le compteur de visites GoatCounter commun au site. Le script travaille dans un clone dédié (`C:/Users/ferrucci/repos/electronics-power-converters-publish`, créé au besoin) et s’arrête si la source n’est pas committée, si un test échoue ou si le clone est modifié.

## Topologie « Redresseur à diodes »

Redresseur AC-DC classique alimenté par une source sinusoïdale réglable (50 ou 60 Hz) : simple diode (monoalternance) ou pont de Graetz (double alternance, paires D1–D3 et D2–D4), filtre L–C (inductance de lissage L_f côté continu, puis condensateur en parallèle) et charge R–L série. Le mode simple ne propose que V_in, R et C ; L_f et l’inductance de charge L n’apparaissent qu’en mode avancé (et valent zéro en mode simple). Un curseur de filtre à zéro retire l’élément : la branche s’estompe dans le schéma. Le filtre à entrée inductive illustre le compromis classique : sans L_f le condensateur se recharge par pointes (tension proche de V̂ mais facteur de puissance dégradé) ; avec L_f suffisante la conduction devient continue, la tension moyenne rejoint 2V̂/π et le facteur de puissance remonte vers 0,9.

Les valeurs moyennes de v_o et i_o sont rappelées sur le bord droit de l’oscilloscope et le bandeau compare la tension moyenne simulée à la formule idéale V̂/π ou 2V̂/π. Les courants tracés suivent la loi des nœuds au condensateur : i_in et i_o en mode simple, plus i_C en mode avancé. Le mode avancé ajoute la tension v_x en sortie du redresseur (avant L_f, tracée si L_f > 0), la tension de la diode D1 (lecture de la tension inverse de crête), les courants côté alternatif (i_in et les courants des paires de diodes, avec les pointes de recharge du condensateur), le choix entre diodes idéales et diodes à chute de 0,6 V, ainsi qu’une vue « Démarrage » avec angle d’enclenchement réglable pour observer le régime transitoire, dont l’appel de courant du condensateur. En régime permanent, la source est idéale et les diodes suivent le modèle choisi : pendant la conduction, v_o suit v_in redressée moins la chute des diodes passantes. La vue « Démarrage » ajoute une résistance R_in de 0,5 Ω côté source, qui limite l’appel de courant du condensateur déchargé.

Le panneau « Régime permanent » (bouton ⓘ) présente en permanence les quatre cas — simple alternance ou pont, sans ou avec condensateur — sous forme de tableau : v_o max, ⟨v_o⟩, la tension inverse de crête, et avec condensateur l’ondulation Δv_o ≈ ⟨i_o⟩/(f_r·C) puis ⟨v_o⟩ ≈ v_o max − Δv_o/2. Les formules sont écrites avec V̂ et V_D0, la tension de seuil du modèle de diode (0 V en modèle idéal, 0,6 V en modèle 0,6 V). Seules les cellules qui s’appliquent au cas courant sont teintées — la ligne v_o max et le bloc choisi par C, dans la colonne du montage — et elles seules portent des valeurs : celle de la formule, la simulation entre parenthèses, et l’écart relatif sur une deuxième ligne quand il dépasse 1 %. Les notes signalent une hypothèse RC ≫ 1/f_r non vérifiée, l’approximation au premier ordre en V_D0, une inductance dans le circuit ou la vue « Démarrage ». Un bloc distinct donne les valeurs purement simulées, pour une diode : facteur de forme, angle de conduction, courant de crête et tension inverse de crête mesurée.

Sous l’oscilloscope, une barre graduée en angle ωt choisit un instant : une ligne verticale et des pastilles le repèrent sur toutes les traces, et chaque diode du schéma passe en vert si elle conduit (courant non nul), en gris si elle est bloquée. Le bouton ▶ fait défiler l’instant en boucle sur la fenêtre visible (zoom compris) ; × retire le curseur et rend au schéma ses diodes noires. Les états viennent des calques `diodes`, `D_on`/`D_off` (simple diode) et `D1_on`…`D4_off` (pont) des dessins Inkscape.

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
