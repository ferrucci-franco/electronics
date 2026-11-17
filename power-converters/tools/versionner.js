'use strict';
/* Marque de version anti-cache sur les CSS/JS locaux de index.html.

   GitHub Pages sert chaque fichier avec max-age=600 : sans marque, un navigateur
   peut garder l'ancien styles.css avec le nouvel index.html (ou l'inverse)
   pendant 10 min. Chaque CSS/JS local référencé par index.html reçoit
   « ?v=<empreinte du contenu> » ; index.html ne change que si l'un de ces
   fichiers change.

   À lancer après toute modification d'un CSS ou d'un JS, avant le commit :

     node power-converters/tools/versionner.js            met à jour index.html
     node power-converters/tools/versionner.js --verifier  code 1 si une marque est périmée */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const racine = path.join(__dirname, '..');
const fichierIndex = path.join(racine, 'index.html');
const verifier = process.argv.includes('--verifier');

const avant = fs.readFileSync(fichierIndex, 'utf8');
const perimes = [];
const apres = avant.replace(
  /(<(?:link|script)\b[^>]*?\b(?:href|src)=")([^":?#]+\.(?:css|js))(?:\?v=([0-9a-f]+))?(")/g,
  (tout, debut, chemin, ancienne, fin) => {
    const fichier = path.join(racine, chemin);
    if (!fs.existsSync(fichier)) return tout;
    const empreinte = crypto.createHash('sha1').update(fs.readFileSync(fichier)).digest('hex').slice(0, 10);
    if (ancienne !== empreinte) perimes.push(chemin);
    return `${debut}${chemin}?v=${empreinte}${fin}`;
  });

if (!perimes.length) { console.log('  index.html : marques à jour.'); process.exit(0); }
if (verifier) { console.error('  Marques périmées : ' + perimes.join(', ')); process.exit(1); }
fs.writeFileSync(fichierIndex, apres);
console.log('  index.html mis à jour : ' + perimes.join(', '));
