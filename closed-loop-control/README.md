# Explorateur de contrôle en boucle fermée

Application pédagogique pour construire et analyser une boucle formée d'une
plante, d'un contrôleur et d'un capteur. Elle réunit le plan s et le lieu des
racines, les contrôleurs PID et rationnels libres, la saturation, Bode, Nyquist,
les surfaces 3D et les réponses temporelles. Interface en français, anglais,
espagnol et italien.

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

99 cas couvrent notamment les polynômes, les interconnexions, les signaux de la
boucle, le PID, le lieu des racines, les marges de stabilité, le retard pur et
la mise en TeX.
