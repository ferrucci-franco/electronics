# Simulateur de convertisseurs

Application HTML/JavaScript autonome pour la classe.

## Ouvrir

Double-cliquez sur `index.html`. Aucune installation et aucun serveur ne sont nécessaires.

L’application comprend :

- `index.html`
- `styles.css` et `pv.css`
- `app.js`
- `topologies/` pour les modèles Buck, Boost, pont en H et PV → réseau
- `assets/` pour les schémas SVG locaux
- `vendor/` pour KaTeX, utilisable sans connexion Internet

Le Buck et le Boost sont synchrones par défaut. Le mode avancé permet de choisir la commutation synchrone ou une réalisation avec interrupteur et diode ; cette dernière prend en compte les régimes CCM et DCM.

Le pont en H propose trois applications :

- onduleur monophasé à PWM bipolaire ou unipolaire, filtre LC et charge R–L ;
- moteur CC commandé manuellement, sans régulateur PI, soit autour de 50 % (50 % = arrêt), soit par sens et roue libre à tension nulle, avec affichage du démarrage ou de huit périodes PWM en régime permanent ;
- injection de courant dans un réseau rigide de 50 Hz à travers une inductance, avec réglage du courant efficace et de sa phase, puis calcul de P, Q, du facteur de puissance et de la THD.

Le mode avancé affiche les trois sous-graphes et les paramètres complémentaires. Les légendes sont cliquables pour masquer ou réafficher chaque trace.

Dans l’oscilloscope, faites glisser avec le bouton gauche horizontalement, verticalement ou en diagonale pour zoomer sur le temps, sur l’axe vertical du sous-graphe choisi, ou sur les deux axes. Faites glisser avec le bouton droit pour déplacer la vue agrandie. Un double-clic ou un double toucher rétablit la vue complète.

Dans l’application réseau du pont en H, la commande du courant peut utiliser une PWM à fréquence fixe ou un comparateur à hystérésis. Dans ce second cas, la demi-bande est réglable et la fréquence de commutation devient variable.

## Topologie « Redresseur à diodes »

Redresseur AC-DC classique alimenté par une source sinusoïdale réglable (50 ou 60 Hz) : simple diode (monoalternance) ou pont de Graetz (double alternance, paires D1–D2 et D3–D4), filtre L–C (inductance de lissage L_f en série puis condensateur en parallèle) et charge R–L série. Chaque curseur de filtre descend à zéro pour retirer l’élément — la branche s’estompe alors dans le schéma — et l’inductance de charge descend à zéro pour retrouver la charge R pure. Le filtre à entrée inductive illustre le compromis classique : sans L_f le condensateur se recharge par pointes (tension proche de V̂ mais facteur de puissance dégradé) ; avec L_f suffisante la conduction devient continue, la tension moyenne rejoint 2V̂/π et le facteur de puissance remonte vers 0,9.

Les valeurs moyennes de v_ch et i_ch sont rappelées sur le bord droit de l’oscilloscope et le bandeau compare la tension moyenne simulée à la formule idéale V̂/π ou 2V̂/π. Le mode avancé ajoute la tension de la diode D1 (lecture de la tension inverse de crête), les courants côté alternatif (i_in et les courants des paires de diodes, avec les pointes de recharge du condensateur), le choix entre diodes idéales et diodes à chute de 0,6 V, ainsi qu’une vue « Démarrage » avec angle d’enclenchement réglable pour observer le régime transitoire, dont l’appel de courant du condensateur. Une petite résistance série de 0,5 Ω côté source limite les pointes de courant, comme dans un redresseur réel.

## Topologie « PV solaire → réseau »

Chaîne photovoltaïque complète : champ PV, boost MPPT, bus continu et pont en H qui injecte un courant sinusoïdal dans le réseau 230 V / 50 Hz.

La scène solaire est interactive :

- faites glisser le soleil le long de sa trajectoire est-ouest (l’éclairement suit la hauteur du soleil via la masse d’air et l’angle d’incidence) ;
- faites glisser les nuages, ou réglez la nébulosité avec le curseur : un nuage placé devant le soleil occulte le faisceau direct ;
- le bouton « Faire défiler la journée » anime le passage du soleil ;
- l’inclinaison du panneau se règle au curseur ou en faisant glisser le panneau lui-même ; la température ambiante et la taille du champ (panneaux par string, strings en parallèle) se règlent par les curseurs.

Les courbes I–V et P–V du champ sont tracées en direct (la référence STC reste en pointillé). En mode MPPT le point de fonctionnement suit le point de puissance maximale ; en mode manuel, faites-le glisser le long de la courbe pour visualiser la puissance perdue hors du MPP.

Le modèle électrique est simulé en commutation : rapport cyclique du boost imposant la tension PV, ondulation à 100 Hz du bus continu (liaison monophasée), PWM unipolaire du pont et suivi de courant avec régulation douce du bus. Le mode avancé ajoute les courants détaillés (i_pv, courant de bus moyenné, et sa version hachée masquée par défaut dans la légende), ainsi que la tension du bus et la fréquence de découpage du boost réglables.
