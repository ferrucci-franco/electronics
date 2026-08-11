# Explorateur H(s)

Application pédagogique pour l'étude des systèmes linéaires : plan s, surfaces
3D de |H(s)| et arg H(s), Bode, Nyquist, réponse temporelle, construction
« règle et compas » et retard pur — le même objet vu de plusieurs façons qui
s'expliquent entre elles. Interface en français, anglais, espagnol et italien.

Aucune dépendance à installer, aucune compilation : `index.html` s'ouvre
directement, y compris en `file://`.

## Bibliothèques incluses

| Bibliothèque | Version | Licence |
| --- | --- | --- |
| [KaTeX](https://katex.org/) | 0.18.1 | MIT — `vendor/katex/LICENSE` |
| [three.js](https://threejs.org/) | r159 | MIT — `vendor/three/LICENSE` |

## Vérification

```
node tests/run.js
```

49 cas sur les fonctions pures — polynômes, évaluation en jω, fenêtre du Bode,
contraintes d'ordre, retard et mise en TeX. Les panneaux dessinent : ceux-là se
vérifient à l'œil, dans un navigateur.

## Conception

Le cahier des charges (`docs/conception-app-laplace.md` du dépôt source) porte
chaque décision et sa raison, y compris celles qui ont été annulées.
