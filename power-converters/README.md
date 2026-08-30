# Simulateur de convertisseurs

Application HTML/JavaScript autonome pour la classe.

## Ouvrir

Double-cliquez sur `index.html`. Aucune installation et aucun serveur ne sont nécessaires.

L’application comprend :

- `index.html`
- `styles.css`
- `app.js`
- `topologies/` pour les modèles Buck, Boost et pont en H
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
