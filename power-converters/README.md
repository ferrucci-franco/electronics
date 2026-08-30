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

## Topologie « PV solaire → réseau »

Chaîne photovoltaïque complète : champ PV, boost MPPT, bus continu et pont en H qui injecte un courant sinusoïdal dans le réseau 230 V / 50 Hz.

La scène solaire est interactive :

- faites glisser le soleil le long de sa trajectoire est-ouest (l’éclairement suit la hauteur du soleil via la masse d’air et l’angle d’incidence) ;
- faites glisser les nuages, ou réglez la nébulosité avec le curseur : un nuage placé devant le soleil occulte le faisceau direct ;
- le bouton « Faire défiler la journée » anime le passage du soleil ;
- l’inclinaison du panneau, la température ambiante et la taille du champ (panneaux par string, strings en parallèle) se règlent par les curseurs.

Les courbes I–V et P–V du champ sont tracées en direct (la référence STC reste en pointillé). En mode MPPT le point de fonctionnement suit le point de puissance maximale ; en mode manuel, faites-le glisser le long de la courbe pour visualiser la puissance perdue hors du MPP.

Le modèle électrique est simulé en commutation : rapport cyclique du boost imposant la tension PV, ondulation à 100 Hz du bus continu (liaison monophasée), PWM unipolaire du pont et suivi de courant avec régulation douce du bus. Le mode avancé ajoute le courant d’inductance du boost, la tension du bus et sa capacité réglables.
