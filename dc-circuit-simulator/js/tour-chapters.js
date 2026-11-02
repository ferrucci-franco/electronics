/* The chapters of the guide (see tour.js): each one loads a small circuit and plays its demo with the
 * gestures of a person (d.tap, d.drag, d.hold, d.key, d.type…), with one short caption per step (d.say).
 * d.mt(mouse, touch) chooses between the two ways of doing a thing.  Keep the texts short: the demo shows. */
(function (root) {
  'use strict';
  const DCS = root.DCS;

  DCS.tourGroups = {
    build: { en: 'Build', fr: 'Construire', es: 'Construir' },
    see: { en: 'Results', fr: 'Résultats', es: 'Resultados' },
    live: { en: 'Live', fr: 'En direct', es: 'En vivo' },
    analyze: { en: 'Analysis', fr: 'Analyse', es: 'Análisis' },
    class: { en: 'In class', fr: 'En classe', es: 'En clase' }
  };

  // small circuits of the demos
  const DIV = {   // source, two resistors, ground
    c: [['vsource', 'V1', 0, 4, 1, { V: 12 }], ['resistor', 'R1', 4, 0, 0, { R: 1000 }], ['resistor', 'R2', 8, 4, 1, { R: 2000 }], ['ground', '', 4, 8, 0]],
    w: [[[0, 2], [0, 0], [2, 0]], [[6, 0], [8, 0], [8, 2]], [[0, 6], [0, 8], [8, 8], [8, 6]]]
  };
  const PARTS = {   // the same parts, not connected yet
    c: [['vsource', 'V1', 0, 4, 1, { V: 12 }], ['resistor', 'R1', 4, 0, 0, { R: 1000 }], ['resistor', 'R2', 8, 4, 1, { R: 2000 }], ['ground', '', 4, 6, 0]],
    w: []
  };
  const MESSY = {   // the same circuit with slanted wires
    c: [['vsource', 'V1', 0, 4, 1, { V: 12 }], ['resistor', 'R1', 5, 0, 0, { R: 1000 }], ['resistor', 'R2', 10, 4, 1, { R: 2000 }], ['ground', '', 5, 9, 0]],
    w: [[[0, 2], [3, 0]], [[7, 0], [10, 2]], [[0, 6], [5, 9]], [[5, 9], [10, 6]]]
  };
  const LED = {   // source, resistor and LED
    c: [['vsource', 'V1', 0, 4, 1, { V: 5 }], ['resistor', 'R1', 4, 0, 0, { R: 220 }], ['led', 'LED1', 8, 4, 1, { color: 'red', Vf: 1.8 }], ['ground', '', 4, 8, 0]],
    w: [[[0, 2], [0, 0], [2, 0]], [[6, 0], [8, 0], [8, 2]], [[0, 6], [0, 8], [8, 8], [8, 6]]]
  };

  const say = (en, fr, es) => ({ en, fr, es });

  DCS.tourChapters = [
    /* ---------------- build ---------------- */
    {
      id: 'place', g: 'build', icon: '＋', est: 15000,
      t: say('Place components', 'Placer des composants', 'Colocar componentes'),
      d: say('Pick a component in the list and tap the grid, or drag it onto the circuit.', 'Choisissez un composant dans la liste et touchez la grille, ou faites-le glisser sur le circuit.', 'Elija un componente de la lista y toque la grilla, o arrástrelo sobre el circuito.'),
      setup(d) { d.load(null); },
      async run(d) {
        const [cx, cy] = d.center();
        await d.cam(['#palette', '#stage'], 1.2, 300);
        d.say(say('Pick a component…', 'Choisissez un composant…', 'Elija un componente…'));
        await d.tap(await d.pal('vsource'));
        d.say(say('…and tap the grid', '…et touchez la grille', '…y toque la grilla'));
        await d.tap({ g: [cx - 4, cy + 1] });
        await d.wait(500);
        d.say(say('Or drag it from the list', 'Ou faites-le glisser depuis la liste', 'O arrástrelo desde la lista'));
        await d.drag(await d.pal('resistor'), [{ g: [cx + 2, cy - 2] }, { g: [cx + 1, cy - 3] }]);
        await d.wait(400);
        d.say(d.mt(say('<b>R</b> rotates, <b>F</b> mirrors', '<b>R</b> fait tourner, <b>F</b> fait un miroir', '<b>R</b> gira, <b>F</b> espeja'),
          say('⟳ rotates the selected component', '⟳ fait tourner le composant sélectionné', '⟳ gira el componente seleccionado')));
        if (d.touch) { await d.tap('#selbar [data-act="rotate"]'); await d.wait(500); await d.tap('#selbar [data-act="rotate"]'); }
        else { await d.key('r'); await d.wait(300); await d.key('r'); }
        await d.wait(500);
        d.say(say('Every circuit needs a ground ⏚', 'Tout circuit a besoin d’une masse ⏚', 'Todo circuito necesita una masa ⏚'));
        await d.tap(await d.pal('ground'));
        await d.tap({ g: [cx + 1, cy + 2] });
        await d.wait(900);
      }
    },
    {
      id: 'wire', g: 'build', icon: '⌐', est: 12000,
      t: say('Wires', 'Fils', 'Cables'),
      d: say('Drag from a terminal to another one: the wire finds its way. The circuit is solved at once.', 'Glissez d’une borne à une autre : le fil trouve son chemin. Le circuit est résolu aussitôt.', 'Arrastre de un terminal a otro: el cable busca su camino. El circuito se resuelve en el acto.'),
      setup(d) { d.load(PARTS); },
      async run(d) {
        await d.camCircuit(1.3, 3, null);
        d.say(say('Drag from a terminal…', 'Glissez depuis une borne…', 'Arrastre desde un terminal…'));
        await d.drag({ g: [0, 2] }, [{ g: [0, 0.4] }, { g: [2, 0] }]);
        d.say(say('…to another terminal', '…jusqu’à une autre borne', '…hasta otro terminal'));
        await d.drag({ g: [6, 0] }, [{ g: [7.6, 0] }, { g: [8, 2] }]);
        d.say(say('Closed circuit: solved at once', 'Circuit fermé : résolu aussitôt', 'Circuito cerrado: se resuelve en el acto'));
        await d.drag({ g: [8, 6] }, [{ g: [5, 6.2] }, { g: [0, 6] }]);
        await d.wait(1600);
      }
    },
    {
      id: 'edit', g: 'build', icon: '✎', est: 11000,
      t: say('Edit values', 'Modifier les valeurs', 'Editar valores'),
      d: (touch) => touch
        ? say('Double tap a component to open its properties. Values take prefixes: 4k7, 2.2M, 10m, 100u…', 'Double-touchez un composant pour ouvrir ses propriétés. Les valeurs acceptent les préfixes : 4k7, 2,2M, 10m, 100u…', 'Doble toque sobre un componente para abrir sus propiedades. Los valores aceptan prefijos: 4k7, 2,2M, 10m, 100u…')
        : say('Double click a component to open its properties. Values take prefixes: 4k7, 2.2M, 10m, 100u…', 'Double-cliquez sur un composant pour ouvrir ses propriétés. Les valeurs acceptent les préfixes : 4k7, 2,2M, 10m, 100u…', 'Doble clic sobre un componente para abrir sus propiedades. Los valores aceptan prefijos: 4k7, 2,2M, 10m, 100u…'),
      setup(d) { d.load(DIV); },
      async run(d) {
        d.say(d.mt(say('Double click a component', 'Double-cliquez sur un composant', 'Doble clic sobre un componente'), say('Double tap a component', 'Double-touchez un composant', 'Doble toque sobre un componente')));
        await d.dbl({ c: 'R2' });
        await d.wait(400);
        d.say(say('Type the value: <b>4k7</b> = 4.7 kΩ', 'Tapez la valeur : <b>4k7</b> = 4,7 kΩ', 'Escriba el valor: <b>4k7</b> = 4,7 kΩ'));
        await d.cam('#pane-props', 1.2);
        await d.type('#pane-props input[data-prop="R"]', '4k7');
        await d.cam(null);
        await d.closePanel();
        d.say(say('Everything is solved again', 'Tout est recalculé', 'Todo se recalcula'));
        await d.cam({ gr: [-2, -2, 11, 9] }, 1.15);
        await d.wait(1800);
        await d.cam(null);
      }
    },
    {
      id: 'tidy', g: 'build', icon: '✦', est: 13000,
      t: say('Tidy, undo, zoom', 'Ranger, annuler, zoomer', 'Ordenar, deshacer, zoom'),
      d: (touch) => touch
        ? say('<b>Prettify</b> (in the ⋯ menu) straightens the wires without changing any connection. Pinch or ± to zoom, one finger to pan.', '<b>Ranger</b> (menu ⋯) redresse les fils sans changer aucune connexion. Pincez ou ± pour zoomer, un doigt pour déplacer.', '<b>Ordenar</b> (menú ⋯) endereza los cables sin cambiar ninguna conexión. Pellizco o ± para el zoom, un dedo para mover.')
        : say('<b>Prettify</b> straightens the wires without changing any connection. Wheel to zoom, right button to pan, Ctrl+Z to undo.', '<b>Ranger</b> redresse les fils sans changer aucune connexion. Molette pour zoomer, bouton droit pour déplacer, Ctrl+Z pour annuler.', '<b>Ordenar</b> endereza los cables sin cambiar ninguna conexión. Rueda para el zoom, botón derecho para mover, Ctrl+Z para deshacer.'),
      setup(d) { d.load(MESSY); },
      async run(d) {
        d.say(say('Slanted wires? One click…', 'Des fils en biais ? Un clic…', '¿Cables torcidos? Un clic…'));
        await d.wait(700);
        if (d.mobile()) { await d.tap('#moreBtn'); await d.wait(300); }
        await d.tap('#tidyBtn');
        d.say(say('…same connections, tidy drawing', '…mêmes connexions, dessin propre', '…mismas conexiones, dibujo prolijo'));
        await d.wait(1500);
        d.say(say('Undo / redo', 'Annuler / rétablir', 'Deshacer / rehacer'));
        const undo = d.mobile() ? '#undoBtn2' : '#undoBtn', redo = d.mobile() ? '#redoBtn2' : '#redoBtn';
        await d.tap(undo); await d.wait(700); await d.tap(redo);
        await d.wait(500);
        d.say(d.mt(say('Wheel: zoom', 'Molette : zoom', 'Rueda: zoom'), say('± and ⛶: zoom and fit', '± et ⛶ : zoom et cadrage', '± y ⛶: zoom y encuadre')));
        if (d.touch) { await d.tap('#zoomIn'); await d.tap('#zoomIn'); await d.wait(400); await d.tap('#zoomFit'); }
        else { await d.wheel({ c: 'R1' }, -100, 3, 150); await d.wait(500); await d.wheel(null, 100, 3, 150); await d.wait(300); await d.tap('#zoomFit'); }
        await d.wait(900);
      }
    },

    /* ---------------- results ---------------- */
    {
      id: 'show', g: 'see', icon: '👁', est: 12000,
      t: say('Voltages, currents, powers', 'Tensions, courants, puissances', 'Tensiones, corrientes, potencias'),
      d: say('The chips over the circuit choose what is drawn: V, I, P, node voltages, and the current flowing.', 'Les pastilles au-dessus du circuit choisissent ce qui est affiché : V, I, P, tensions de nœud, et le courant qui circule.', 'Las pastillas sobre el circuito eligen qué se muestra: V, I, P, tensiones de nodo y la corriente circulando.'),
      setup(d) { d.load('mesh'); },
      async run(d) {
        await d.camCircuit(1.2, 2, ['.viewbar']);
        d.say(say('<b>P</b>: power (green = delivered)', '<b>P</b> : puissance (vert = fournie)', '<b>P</b>: potencia (verde = entregada)'));
        await d.tap('.viewbar [data-show="showP"]');
        await d.wait(1600);
        d.say(say('<b>Nodes</b>: voltages to ground', '<b>Nœuds</b> : tensions par rapport à la masse', '<b>Nodos</b>: tensiones respecto de masa'));
        await d.tap('.viewbar [data-show="showNodes"]');
        await d.wait(1600);
        d.say(say('<b>Flow</b>: the current in motion', '<b>Flux</b> : le courant en mouvement', '<b>Flujo</b>: la corriente en movimiento'));
        await d.tap('.viewbar [data-show="animate"]');
        await d.move({ g: [8, 9] });
        await d.wait(2600);
        if (!d.touch) {
          d.say(say('Hover a component for a summary', 'Survolez un composant pour un résumé', 'Pase el puntero sobre un componente: resumen'));
          await d.move({ c: 'R3' }); await d.wait(1800);
        }
      }
    },
    {
      id: 'refs', g: 'see', icon: '±', est: 10000,
      t: say('Reference directions', 'Sens de référence', 'Sentidos de referencia'),
      d: say('Each value carries the sign of its references, as in an exercise done by hand. Select an element and tap its + / − or its arrow to choose them.', 'Chaque valeur porte le signe de ses références, comme dans un exercice fait à la main. Sélectionnez un élément et touchez son + / − ou sa flèche pour les choisir.', 'Cada valor lleva el signo de sus referencias, como en un ejercicio hecho a mano. Seleccione un elemento y toque su + / − o su flecha para elegirlas.'),
      setup(d) { d.load(DIV); },
      async run(d) {
        d.say(say('Select an element', 'Sélectionnez un élément', 'Seleccione un elemento'));
        await d.tap({ c: 'R1' });
        await d.wait(500);
        d.say(say('Tap its arrow: the reference turns over…', 'Touchez sa flèche : la référence s’inverse…', 'Toque su flecha: la referencia se invierte…'));
        await d.cam({ gr: [-1, -3, 10, 4] }, 1.5);
        await d.tap(d.mark('R1', 'i'));
        d.say(say('…and the values change sign', '…et les valeurs changent de signe', '…y los valores cambian de signo'));
        await d.wait(2000);
        await d.tap(d.mark('R1', 'i'));
        await d.wait(900);
        await d.cam(null);
      }
    },
    {
      id: 'kirchhoff', g: 'see', icon: '∑', est: 9000,
      t: say('Tables and Kirchhoff', 'Tableaux et Kirchhoff', 'Tablas y Kirchhoff'),
      d: say('The <b>Results</b> tab lists node voltages, every element, KCL at each node and KVL around each loop, and the power balance.', 'L’onglet <b>Résultats</b> liste les tensions de nœud, chaque élément, la loi des nœuds et la loi des mailles, et le bilan de puissance.', 'La pestaña <b>Resultados</b> lista tensiones de nodo, cada elemento, LKC en cada nodo y LKT en cada lazo, y el balance de potencia.'),
      setup(d) { d.load('mesh'); },
      async run(d) {
        d.say(say('Tab <b>Results</b>', 'Onglet <b>Résultats</b>', 'Pestaña <b>Resultados</b>'));
        await d.panel('results');
        await d.cam('#side', 1.15);
        await d.wait(1400);
        d.say(say('KCL and KVL, checked ✓', 'Lois des nœuds et des mailles, vérifiées ✓', 'LKC y LKT, verificadas ✓'));
        const k = d.$$('#pane-results .card')[2];
        if (k) await d.scrollUp(k, 700);
        await d.wait(2600);
        await d.cam(null);
      }
    },

    /* ---------------- live ---------------- */
    {
      id: 'slider', g: 'live', icon: '⇆', est: 12000,
      t: say('Change a value live', 'Changer une valeur en direct', 'Cambiar un valor en vivo'),
      d: (touch) => touch
        ? say('Long press a component and lift: a slider appears. Drag it and the circuit is solved at every step.', 'Appui long sur un composant puis relâchez : un curseur apparaît. Faites-le glisser, le circuit est résolu à chaque pas.', 'Mantenga apretado un componente y suelte: aparece un deslizador. Al arrastrarlo, el circuito se resuelve a cada paso.')
        : say('Hold the button down on a component: a slider appears. Drag it and the circuit is solved at every step. The wheel works too.', 'Maintenez le bouton appuyé sur un composant : un curseur apparaît. Faites-le glisser, le circuit est résolu à chaque pas. La molette aussi.', 'Mantenga apretado el botón sobre un componente: aparece un deslizador. Al arrastrarlo, el circuito se resuelve a cada paso. La rueda también.'),
      setup(d) { d.load(DIV); },
      async run(d) {
        await d.camCircuit(1.3, 3.5);
        d.say(d.mt(say('Hold the button down on R2', 'Maintenez le bouton appuyé sur R2', 'Mantenga apretado el botón sobre R2'), say('Long press R2 and lift', 'Appui long sur R2 puis relâchez', 'Mantenga apretado R2 y suelte')));
        await d.hold({ c: 'R2' }, 700);
        await d.until(() => d.$('.qslider .spring') && !d.$('.qslider').hidden);
        await d.wait(300);
        d.say(say('Drag: everything follows', 'Glissez : tout suit', 'Arrastre: todo acompaña'));
        const sp = d.$('.qslider .spring');
        await d.drag({ el: sp, ax: 0.5 }, [{ el: sp, ax: 0.92 }], { ms: 1400, end: 300 });
        await d.wait(500);
        await d.drag({ el: sp, ax: 0.5 }, [{ el: sp, ax: 0.06 }], { ms: 1400, end: 300 });
        await d.wait(600);
        if (!d.touch) {
          d.say(say('Or the wheel over the selected component', 'Ou la molette sur le composant sélectionné', 'O la rueda sobre el componente seleccionado'));
          await d.wheel({ c: 'R2' }, -100, 5, 260);
        }
        await d.wait(800);
      }
    },
    {
      id: 'switch', g: 'live', icon: '⏻', est: 15000,
      t: say('Switches and potentiometers', 'Interrupteurs et potentiomètres', 'Interruptores y potenciómetros'),
      d: say('A selected switch opens and closes with each tap; a push button works while held. Drag the wiper arrow of a potentiometer.', 'Un interrupteur sélectionné s’ouvre et se ferme à chaque toucher ; un bouton-poussoir agit tant qu’il est appuyé. Faites glisser la flèche d’un potentiomètre.', 'Un interruptor seleccionado se abre y se cierra con cada toque; un pulsador actúa mientras se lo mantiene apretado. Arrastre la flecha de un potenciómetro.'),
      setup(d) { d.load('switches'); },
      async run(d) {
        await d.camCircuit(1.3, 1.5);
        d.say(say('Select the switch, then each tap flips it', 'Sélectionnez l’interrupteur, puis chaque toucher le bascule', 'Seleccione el interruptor; luego cada toque lo cambia'));
        await d.tap({ c: 'S1' });
        await d.wait(500);
        await d.tap({ c: 'S1' }); await d.wait(1100);
        await d.tap({ c: 'S1' }); await d.wait(900);
        d.say(say('Push button: on while held', 'Bouton-poussoir : actif tant qu’il est appuyé', 'Pulsador: actúa mientras está apretado'));
        await d.tap({ c: 'S2' });
        await d.wait(500);
        await d.drag({ c: 'S2' }, [{ c: 'S2' }], { pause: 1500, end: 10 });
        await d.wait(900);
        d.load('pot');
        await d.camCircuit(1.3, 1.5, null);
        await d.wait(300);
        d.say(say('Potentiometer: drag its arrow', 'Potentiomètre : faites glisser sa flèche', 'Potenciómetro: arrastre su flecha'));
        const c = d.comp('P1'), x0 = d.C.potX(c);
        await d.drag({ c: 'P1', l: [x0, -1] }, [{ c: 'P1', l: [x0 + 1.4, -1] }, { c: 'P1', l: [x0 - 1.5, -1] }], { ms: 1500, end: 200 });
        await d.wait(900);
      }
    },

    /* ---------------- analysis ---------------- */
    {
      id: 'iv', g: 'analyze', icon: '📈', est: 15000,
      t: say('I–V curve and operating point', 'Caractéristique I–V et point de fonctionnement', 'Curva I–V y punto de operación'),
      d: say('Select an element: its I–V characteristic shows where it works (Q). 📌 keeps the plot over the circuit while you change values.', 'Sélectionnez un élément : sa caractéristique I–V montre où il travaille (Q). 📌 garde le graphique sur le circuit pendant que vous changez les valeurs.', 'Seleccione un elemento: su característica I–V muestra dónde trabaja (Q). 📌 deja la gráfica sobre el circuito mientras cambia los valores.'),
      setup(d) { d.load(LED); d.roomy(true, false); },
      async run(d) {
        d.say(say('Select the LED', 'Sélectionnez la LED', 'Seleccione el LED'));
        await d.tap({ c: 'LED1' });
        await d.wait(300);
        await d.panel('props');
        const pin = d.$('#pane-props .iv-pin');
        if (pin) { await d.scrollTo(pin.closest('.card')); }
        d.say(say('Its curve, and Q: where it works', 'Sa courbe, et Q : où elle travaille', 'Su curva, y Q: dónde trabaja'));
        await d.cam(pin ? pin.closest('.card') : '#side', 1.2);
        await d.wait(1800);
        d.say(say('📌 pins it over the circuit', '📌 l’épingle sur le circuit', '📌 la fija sobre el circuito'));
        await d.tap('#pane-props .iv-pin');
        await d.cam(null);
        await d.closePanel();
        const mon = d.$('.monitor:not(.tmon):not([hidden])');
        if (mon) {
          d.say(say('Move it by its title', 'Déplacez-la par son titre', 'Muévala por su título'));
          await d.parkWin(mon, mon.querySelector('.mon-head'), d.mobile() ? 'tr' : 'br');
          await d.clearOf(mon);
        }
        await d.camCircuit(1.2, 2, mon ? [mon] : null);
        d.say(say('Change R1: Q moves along the curve', 'Changez R1 : Q glisse sur la courbe', 'Cambie R1: Q se mueve por la curva'));
        await d.hold({ c: 'R1' }, 700);
        await d.until(() => d.$('.qslider .spring') && !d.$('.qslider').hidden);
        const sp = d.$('.qslider .spring');
        await d.drag({ el: sp, ax: 0.5 }, [{ el: sp, ax: 0.1 }, { el: sp, ax: 0.85 }], { ms: 1700, end: 300 });
        await d.wait(1200);
      }
    },
    {
      id: 'thev', g: 'analyze', icon: '⧉', est: 13000,
      t: say('Thévenin and Norton', 'Thévenin et Norton', 'Thévenin y Norton'),
      d: say('Select a load and choose “Thévenin seen by this element”, or use the <b>Thévenin A–B</b> tool on two nodes. The equivalent follows every change.', 'Sélectionnez une charge et choisissez « Thévenin vu par cet élément », ou l’outil <b>Thévenin A–B</b> sur deux nœuds. L’équivalent suit chaque changement.', 'Seleccione una carga y elija «Thévenin visto por este elemento», o la herramienta <b>Thévenin A–B</b> sobre dos nodos. El equivalente sigue cada cambio.'),
      setup(d) { d.load('thevenin'); d.roomy(true, false); },
      async run(d) {
        d.say(say('Select the load', 'Sélectionnez la charge', 'Seleccione la carga'));
        await d.tap({ c: 'RL' });
        await d.wait(400);
        d.say(say('Thévenin seen by this element', 'Thévenin vu par cet élément', 'Thévenin visto por este elemento'));
        await d.tap('#selbar [data-act="thev"]');
        await d.wait(600);
        const card = d.$('#pane-thev .thev-pin');
        if (card) await d.scrollTo(card.closest('.card'));
        await d.cam(card ? card.closest('.card') : '#side', 1.2);
        d.say(say('V<sub>Th</sub>, R<sub>Th</sub> and I<sub>N</sub>, drawn', 'E<sub>Th</sub>, R<sub>Th</sub> et I<sub>N</sub>, dessinés', 'V<sub>Th</sub>, R<sub>Th</sub> e I<sub>N</sub>, dibujados'));
        await d.wait(2200);
        d.say(say('📌 keeps it over the circuit, live', '📌 le garde sur le circuit, en direct', '📌 lo deja sobre el circuito, en vivo'));
        await d.tap('#pane-thev .thev-pin');
        await d.cam(null);
        await d.closePanel();
        const tm = d.$('.monitor.tmon');
        if (tm) { await d.parkWin(tm, tm.querySelector('.mon-head') || tm, 'tr'); await d.clearOf(tm); }
        await d.camCircuit(1.2, 1.5, tm ? [tm] : null);
        await d.hold({ c: 'R2' }, 700);
        await d.until(() => d.$('.qslider .spring') && !d.$('.qslider').hidden);
        const sp = d.$('.qslider .spring');
        await d.drag({ el: sp, ax: 0.5 }, [{ el: sp, ax: 0.9 }], { ms: 1300, end: 300 });
        await d.wait(1200);
      }
    },
    {
      id: 'req', g: 'analyze', icon: 'Ω', est: 12000,
      t: say('Equivalent resistance, step by step', 'Résistance équivalente, pas à pas', 'Resistencia equivalente, paso a paso'),
      d: say('Sources turned off, then series, parallels and Δ→Y one step at a time; touch a step to see its resistors on the circuit.', 'Sources éteintes, puis séries, parallèles et Δ→Y une étape à la fois ; touchez une étape pour voir ses résistances sur le circuit.', 'Fuentes pasivadas, luego series, paralelos y Δ→Y paso a paso; toque un paso para ver sus resistencias en el circuito.'),
      setup(d) { d.load('thevenin'); },
      async run(d) {
        await d.tap({ c: 'RL' });
        await d.tap('#selbar [data-act="thev"]');
        await d.wait(500);
        d.say(say('Show the steps', 'Afficher les étapes', 'Mostrar la deducción'));
        const b = d.$$('#pane-thev .card')[1].querySelector('.ivhead .btn');
        await d.cam(b.closest('.card'), 1.2);
        await d.tap(b);
        await d.wait(600);
        const steps = d.$$('#pane-thev .req-steps li');
        d.say(say('Each step, with its resistors highlighted', 'Chaque étape, avec ses résistances en couleur', 'Cada paso, con sus resistencias resaltadas'));
        for (const s of steps.slice(0, 3)) { await d.scrollTo(s); await d.cam([s, '#stage'], 1.1); await d.tap(s); await d.wait(1600); }
        if (!steps.length) await d.wait(2500);
        await d.cam(null);
        await d.wait(600);
      }
    },
    {
      id: 'sweep', g: 'analyze', icon: '∿', est: 16000,
      t: say('DC sweep', 'Balayage DC', 'Barrido DC'),
      d: say('Select what to measure (a wire = its node voltage), button 📈, then tap the component that varies. Drag on the plot to move the circuit along the curve.', 'Sélectionnez ce qu’on mesure (un fil = la tension de son nœud), bouton 📈, puis touchez le composant qui varie. Glissez sur le graphique pour déplacer le circuit le long de la courbe.', 'Seleccione qué medir (un cable = la tensión de su nodo), botón 📈, y toque el componente que varía. Arrastre sobre la gráfica para mover el circuito por la curva.'),
      setup(d) { d.load('inverting'); d.roomy(true, true); },
      async run(d) {
        d.say(say('Select the output wire', 'Sélectionnez le fil de sortie', 'Seleccione el cable de salida'));
        await d.tap({ g: [14.5, 4] });
        await d.wait(300);
        d.say(say('Button 📈 DC sweep', 'Bouton 📈 balayage DC', 'Botón 📈 barrido DC'));
        await d.tap('#selbar [data-act="sweep"]');
        await d.wait(700);
        d.say(say('Tap the component that varies', 'Touchez le composant qui varie', 'Toque el componente que varía'));
        await d.tap({ c: 'Vin' });
        await d.wait(900);
        d.say(say('Gain −10, then saturation', 'Gain −10, puis saturation', 'Ganancia −10, luego saturación'));
        const cv = d.$('.sw-cv'), win = d.$('.swmon');
        if (cv && win) {
          await d.cam(win, 1.05);
          await d.wait(1200);
          await d.cam(null);
          await d.parkWin(win, win.querySelector('.mon-head'), d.mobile() ? 'br' : 'tr');
          await d.clearOf(win);
          d.say(say('Drag on the plot: the circuit follows', 'Glissez sur le graphique : le circuit suit', 'Arrastre sobre la gráfica: el circuito acompaña'));
          await d.drag({ el: cv, ax: 0.5, ay: 0.5 }, [{ el: cv, ax: 0.2, ay: 0.5 }, { el: cv, ax: 0.8, ay: 0.5 }, { el: cv, ax: 0.55, ay: 0.5 }], { ms: 1300 });
        }
        await d.wait(1200);
      }
    },

    /* ---------------- in class ---------------- */
    {
      id: 'quiz', g: 'class', icon: '🎓', est: 13000,
      t: say('Quiz', 'Quiz', 'Quiz'),
      d: say('Question decks on circuits drawn in the simulator: answer, check, and see the solution on the circuit. Each deck has a QR code for the students.', 'Des séries de questions sur des circuits dessinés dans le simulateur : répondez, vérifiez, et voyez la solution sur le circuit. Chaque série a un code QR pour les élèves.', 'Mazos de preguntas sobre circuitos dibujados en el simulador: responda, verifique y vea la solución en el circuito. Cada mazo tiene un código QR para los estudiantes.'),
      setup(d) { d.load(null); },
      async run(d) {
        d.say(say('Button Quiz', 'Bouton Quiz', 'Botón Quiz'));
        if (d.mobile()) { await d.tap('#moreBtn'); await d.wait(300); }
        await d.tap('#quizBtn');
        await d.wait(600);
        d.say(say('Choose a deck', 'Choisissez une série', 'Elija un mazo'));
        const start = d.$('#modalBody .quiz-card .btn.primary');
        await d.cam(start.closest('.quiz-card'), 1.2);
        await d.tap(start);
        await d.cam(null);
        await d.wait(900);
        d.say(say('Answer…', 'Répondez…', 'Responda…'));
        await d.panel('quiz');
        const inp = d.$('#pane-quiz input[type="text"], #pane-quiz input:not([type])');
        const cur = d.app.ui.quiz.current && d.app.ui.quiz.current();
        if (inp && cur && cur.q.answer && cur.q.answer.kind === 'num') {
          await d.cam(inp.closest('.card') || '#pane-quiz', 1.2);
          const v = cur.q.answer.value(cur.p, cur.sol);
          const ans = d.W.DCS.units.format(v, '', { digits: 3, trim: true }).replace(/\s/g, '').replace('µ', 'u');
          await d.type(inp, ans, { enter: false });
          d.say(say('…and check', '…et vérifiez', '…y verifique'));
          const ok = Array.from(inp.closest('.card').querySelectorAll('.btn.primary')).find((b) => b.offsetWidth);
          if (ok) await d.tap(ok); else await d.key('Enter', '↵');
          await d.wait(500);
          d.say(say('The explanation, step by step', 'L’explication, pas à pas', 'La explicación, paso a paso'));
          const ex = d.$('#pane-quiz .quiz-explain');
          if (ex) { await d.scrollTo(ex); await d.cam(ex, 1.2); }
          await d.wait(2400);
        } else if (cur && cur.q.answer && cur.q.answer.kind === 'choice') {
          const bs = d.$$('#pane-quiz .quiz-choice');
          const k = cur.q.answer.value(cur.p, cur.sol);
          if (bs[k]) { await d.cam(bs[k].closest('.card'), 1.2); await d.tap(bs[k]); }
          await d.wait(2400);
        } else await d.wait(2400);
        await d.cam(null);
      }
    },
    {
      id: 'share', g: 'class', icon: '⇪', est: 11000,
      t: say('Share with a QR code', 'Partager par code QR', 'Compartir con código QR'),
      d: say('<b>File → Share</b> shows the circuit as a QR code to project in class: the students open it with the phone camera. Files, links and PNG images too.', '<b>Fichier → Partager</b> affiche le circuit en code QR à projeter en classe : les élèves l’ouvrent avec l’appareil photo du téléphone. Aussi fichiers, liens et images PNG.', '<b>Archivo → Compartir</b> muestra el circuito como código QR para proyectar en clase: los estudiantes lo abren con la cámara del celular. También archivos, enlaces e imágenes PNG.'),
      setup(d) { d.load(DIV); },
      async run(d) {
        d.say(say('File → Share', 'Fichier → Partager', 'Archivo → Compartir'));
        if (d.mobile()) { await d.tap('#moreBtn'); await d.wait(300); }
        await d.tap('#fileBtn');
        await d.wait(400);
        await d.tap('#fileMenu [data-file="qr"]');
        await d.wait(700);
        d.say(say('The students scan it: the circuit opens on their phone', 'Les élèves le scannent : le circuit s’ouvre sur leur téléphone', 'Los estudiantes lo escanean: el circuito se abre en su celular'));
        await d.cam('#modal .modal', 1.1);
        await d.wait(2600);
        await d.cam(null);
        await d.tap('#modalClose');
        await d.wait(500);
      }
    },
    {
      id: 'tabs', g: 'class', icon: '⊞', est: 11000,
      t: say('Tabs and examples', 'Onglets et exemples', 'Pestañas y ejemplos'),
      d: say('Several circuits open at once, each with its own undo; <b>+</b> opens a new one. <b>Examples</b> has ready-made circuits to start from.', 'Plusieurs circuits ouverts à la fois, chacun avec son propre historique ; <b>+</b> en ouvre un nouveau. <b>Exemples</b> propose des circuits prêts à l’emploi.', 'Varios circuitos abiertos a la vez, cada uno con su propio deshacer; <b>+</b> abre uno nuevo. <b>Ejemplos</b> trae circuitos listos para empezar.'),
      setup(d) { d.load(DIV); },
      async run(d) {
        d.say(say('<b>+</b>: a new tab', '<b>+</b> : un nouvel onglet', '<b>+</b>: una pestaña nueva'));
        await d.tap('#tabAdd');
        await d.wait(700);
        d.say(say('<b>Examples</b>: ready-made circuits', '<b>Exemples</b> : circuits prêts à l’emploi', '<b>Ejemplos</b>: circuitos listos'));
        if (d.mobile()) { await d.tap('#moreBtn'); await d.wait(300); }
        await d.tap('#examplesBtn');
        await d.wait(600);
        const cards = d.$$('#modalBody .ex-card');
        const pick = cards[Math.min(cards.length - 1, 4)];
        if (pick) { await d.scrollTo(pick); await d.tap(pick); }
        await d.wait(1200);
        d.say(say('Switch between circuits with the tabs', 'Passez d’un circuit à l’autre avec les onglets', 'Cambie de circuito con las pestañas'));
        const tabs = d.$$('#tabbar .ctab');
        if (tabs[0]) { await d.tap(tabs[0].querySelector('.ctab-name') || tabs[0]); await d.wait(1000); }
        if (tabs[1]) { await d.tap(d.$$('#tabbar .ctab')[1].querySelector('.ctab-name') || d.$$('#tabbar .ctab')[1]); }
        await d.wait(1000);
      }
    }
  ];
})(window);
