/* Chapters of the animations (see tour.js). Each one sets the app up (setup), then plays its steps: every
 * step changes what it needs (d.set, d.sweep), moves the axes (d.view), draws notes on the plots (d.draw)
 * and says one caption (d.say). The numbers of the captions are read on the plot, so they always match
 * what is on screen. Values and wording follow TD6 (leakage, Flat Top, sine in noise) and TP1 (1000 Hz and
 * 1030 Hz, peak and RMS values). $…$ is TeX. */
(function () {
  'use strict';
  const S = (es, fr, en) => ({ es, fr, en });
  const TOBS = '$T_\\mathrm{obs}$';
  const DF = '$\\Delta f$';

  // every chapter starts from the same complete settings, then changes a few
  const BASE = {
    'signal-sine': true, amplitude: 1, offset: 0, frequency: 1000, phase: 0, 'duty-cycle': 50,
    'enable-signal2': false, 'signal2-sine': true, amplitude2: 1, offset2: 0, frequency2: 1030, phase2: 0, 'duty-cycle2': 50,
    'enable-noise': false, 'noise-level': 50,
    cycles: 10, 'max-freq': 3000,
    'x-scale': 'linear', 'y-scale': 'linear', 'show-phase': false, 'rms-mode': false,
    'show-advanced': true, 'analysis-type': 'fft', 'continuous-mode': false,
    'window-type': 'rectangular', 'time-display': 'original'
  };

  // a bar in dB, or "below −100 dB" when the app does not draw it
  const db = (d, bar) => (bar.y == null ? '< −100 dBV' : `${d.num(bar.y, 2)} dBV`);
  const dbNum = (d, bar) => (bar.y == null ? '< −100' : d.num(bar.y, 3));

  window.FourierTourChapters = [
    /* ------------------------------------------------------------------ */
    {
      id: 'leakage', icon: '💧', seed: 1,
      t: S('Fuga espectral', 'Fuite spectrale', 'Spectral leakage'),
      d: S('Por qué una sinusoide pura da varias barras cuando el registro no contiene un número entero de períodos.',
        'Pourquoi une sinusoïde pure donne plusieurs barres quand l’enregistrement ne contient pas un nombre entier de périodes.',
        'Why a pure sine gives several bars when the record does not hold a whole number of periods.'),
      async setup(d) {
        await d.config({ ...BASE, amplitude: 5, frequency: 500, 'max-freq': 1500, cycles: 10 });
        await d.view('plot1', 'auto');
        await d.view('plot1', { y: [-6.5, 8] });
        await d.view('plot2', 'auto');
        await d.view('plot2', { y: [0, 7.6] });
      },
      steps: [
        async (d) => {
          await d.focus('plot1');
          await d.draw('plot1', d.span(0, 0.002, 6.1, '$T_0$ = 2 ms', { tick: 0.45 }));
          d.say(S('Una sinusoide de 5 V a 500 Hz (período $T_0$ = 2 ms), registrada durante exactamente <b>10 períodos</b>.',
            'Une sinusoïde de 5 V à 500 Hz (période $T_0$ = 2 ms), enregistrée pendant exactement <b>10 périodes</b>.',
            'A 5 V sine at 500 Hz (period $T_0$ = 2 ms), recorded for exactly <b>10 periods</b>.'));
        },
        async (d) => {
          await d.clear('plot1');
          await d.focus('plot2');
          await d.view('plot2', { x: [175, 825], y: [0, 7.6] }, 900);
          const df = d.df();
          await d.draw('plot2', d.span(550, 600, 0.7, `${DF} = ${d.hz(df)}`, { tick: 0.2 }));
          d.say(S(`${TOBS} = 10 × 2 ms = ${d.ms(d.tobs())}. Las barras del espectro están separadas por ${DF} = $1/T_\\mathrm{obs}$ = ${d.hz(df)}.`,
            `${TOBS} = 10 × 2 ms = ${d.ms(d.tobs())}. Les barres du spectre sont espacées de ${DF} = $1/T_\\mathrm{obs}$ = ${d.hz(df)}.`,
            `${TOBS} = 10 × 2 ms = ${d.ms(d.tobs())}. The bars of the spectrum are ${DF} = $1/T_\\mathrm{obs}$ = ${d.hz(df)} apart.`));
        },
        async (d) => {
          const b = d.bar(500);
          await d.draw('plot2', d.span(550, 600, 0.7, `${DF} = ${d.hz(d.df())}`, { tick: 0.2 }), d.note(b.x, b.y, d.volt(b.y), { ay: -30 }));
          d.say(S('500 Hz = 10 × 50 Hz: la frecuencia de la señal cae justo sobre una barra. Una sola barra no es nula, y vale 5 V: la amplitud de la sinusoide.',
            '500 Hz = 10 × 50 Hz : la fréquence du signal tombe exactement sur une barre. Une seule barre n’est pas nulle, et elle vaut 5 V : l’amplitude de la sinusoïde.',
            '500 Hz = 10 × 50 Hz: the frequency of the signal falls exactly on a bar. Only one bar is not zero, and it is 5 V: the amplitude of the sine.'));
        },
        async (d) => {
          await d.clear('plot2');
          d.say(S('Ahora registramos <b>10,5 períodos</b>. La sinusoide es la misma: solo cambia la duración del registro.',
            'Enregistrons maintenant <b>10,5 périodes</b>. La sinusoïde est la même : seule la durée de l’enregistrement change.',
            'Now we record <b>10.5 periods</b>. The sine is the same: only the length of the record changes.'));
          await d.wait(1600);
          await d.sweep('cycles', [10.1, 10.2, 10.3, 10.4, 10.5], 650);
          d.hold = 2500;
        },
        async (d) => {
          const [l, r] = d.top(2, 400, 600).sort((a, b) => a.x - b.x);
          await d.draw('plot2', d.vline(500, '500 Hz'),
            d.note(l.x, l.y, d.hz(l.x), { ax: -48, ay: -26 }), d.note(r.x, r.y, d.hz(r.x), { ax: 48, ay: -26 }));
          d.say(S(`${TOBS} = ${d.ms(d.tobs())} y ${DF} = ${d.hz(d.df())}: las barras más cercanas están en ${d.hz(l.x)} y ${d.hz(r.x)}. Ya no hay ninguna barra en 500 Hz.`,
            `${TOBS} = ${d.ms(d.tobs())} et ${DF} = ${d.hz(d.df())} : les barres les plus proches sont à ${d.hz(l.x)} et ${d.hz(r.x)}. Il n’y a plus de barre à 500 Hz.`,
            `${TOBS} = ${d.ms(d.tobs())} and ${DF} = ${d.hz(d.df())}: the nearest bars are at ${d.hz(l.x)} and ${d.hz(r.x)}. There is no bar at 500 Hz any more.`));
        },
        async (d) => {
          const [l, r] = d.top(2, 400, 600).sort((a, b) => a.x - b.x);
          await d.draw('plot2', d.vline(500), d.hline(5, '5 V', { x: 0.01, x1: 0.74 }),
            d.note(l.x, l.y, d.volt(l.y), { ax: -48, ay: -26 }), d.note(r.x, r.y, d.volt(r.y), { ax: 48, ay: -26 }));
          d.say(S(`La amplitud de 5 V se reparte entre las barras vecinas: es la <b>fuga espectral</b>. Las dos barras más altas valen solo ${d.volt(l.y, 2)} y ${d.volt(r.y, 2)}.`,
            `L’amplitude de 5 V se répartit sur les barres voisines : c’est la <b>fuite spectrale</b>. Les deux plus hautes barres ne valent que ${d.volt(l.y, 2)} et ${d.volt(r.y, 2)}.`,
            `The 5 V amplitude is spread over the neighbouring bars: this is <b>spectral leakage</b>. The two highest bars are only ${d.volt(l.y, 2)} and ${d.volt(r.y, 2)}.`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('y-scale', 'db');
          await d.view('plot2', { x: [-30, 1530], y: [-45, 22] }, 0);
          const far = d.bar(1000);
          await d.draw('plot2', d.vline(500, '500 Hz'), d.note(far.x, far.y, db(d, far), { ay: -32 }));
          d.say(S(`En dB se ve hasta dónde llega: la fuga se extiende por todo el espectro, hasta 0 Hz (${db(d, far)} a 1000 Hz).`,
            `En dB, on voit jusqu’où elle va : la fuite s’étend sur tout le spectre, jusqu’à 0 Hz (${db(d, far)} à 1 000 Hz).`,
            `In dB we see how far it goes: the leakage spreads over the whole spectrum, down to 0 Hz (${db(d, far)} at 1000 Hz).`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('cycles', 10);
          const b = d.bar(500);
          await d.draw('plot2', d.note(b.x, b.y, db(d, b), { ax: 70, ay: -14 }));
          d.say(S('De nuevo 10 períodos: una sola barra. Una raya cae sobre una barra solo si el registro contiene un <b>número entero de períodos</b>.',
            'De nouveau 10 périodes : une seule barre. Une raie tombe sur une barre seulement si l’enregistrement contient un <b>nombre entier de périodes</b>.',
            'Back to 10 periods: a single bar. A line falls on a bar only if the record holds a <b>whole number of periods</b>.'));
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'windows', icon: '🪟', seed: 1,
      t: S('Ventanas', 'Fenêtres', 'Windows'),
      d: S('Rectangular, Hanning, Blackman y Flat Top frente a la fuga: qué gana y qué pierde cada una.',
        'Rectangulaire, Hanning, Blackman et Flat Top face à la fuite : ce que chacune gagne et ce qu’elle perd.',
        'Rectangular, Hanning, Blackman and Flat Top against leakage: what each one gains and what it loses.'),
      async setup(d) {
        await d.config({ ...BASE, amplitude: 5, frequency: 500, 'max-freq': 1500, cycles: 10.5 });
        await d.view('plot1', 'auto');
        await d.view('plot2', 'auto');
        await d.view('plot2', { x: [175, 825], y: [0, 7.6] });
      },
      steps: [
        async (d) => {
          await d.focus('plot2');
          const [l, r] = d.top(2, 400, 600).sort((a, b) => a.x - b.x);
          await d.draw('plot2', d.hline(5, '5 V', { x: 0.01, x1: 0.74 }),
            d.note(l.x, l.y, d.volt(l.y), { ax: -48, ay: -26 }), d.note(r.x, r.y, d.volt(r.y), { ax: 48, ay: -26 }));
          d.say(S(`5 V a 500 Hz, registrada durante 10,5 períodos, con la ventana <b>Rectangular</b>: por la fuga, las barras más altas valen ${d.volt(l.y, 2)} y ${d.volt(r.y, 2)} en lugar de 5 V.`,
            `5 V à 500 Hz, enregistrée pendant 10,5 périodes, avec la fenêtre <b>Rectangulaire</b> : à cause de la fuite, les plus hautes barres valent ${d.volt(l.y, 2)} et ${d.volt(r.y, 2)} au lieu de 5 V.`,
            `5 V at 500 Hz, recorded for 10.5 periods, with the <b>Rectangular</b> window: because of leakage, the highest bars are ${d.volt(l.y, 2)} and ${d.volt(r.y, 2)} instead of 5 V.`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('y-scale', 'db');
          await d.view('plot2', { x: [-30, 1530], y: [-95, 22] }, 0);
          const far = d.bar(1000);
          await d.draw('plot2', d.note(far.x, far.y, db(d, far), { ay: -32 }));
          d.say(S(`En dB, con la Rectangular: lejos del pico la fuga sigue alta, ${db(d, far)} a 1000 Hz.`,
            `En dB, avec la Rectangulaire : loin du pic, la fuite reste forte, ${db(d, far)} à 1 000 Hz.`,
            `In dB, with the Rectangular window: far from the peak the leakage stays high, ${db(d, far)} at 1000 Hz.`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('window-type', 'hanning');
          const far = d.bar(1000);
          await d.draw('plot2', d.note(far.x, far.y == null ? -95 : far.y, db(d, far), { ay: -32 }));
          d.say(S(`<b>Hanning</b>: lejos del pico, la fuga cae a ${db(d, far)}. A cambio, el pico se ensancha.`,
            `<b>Hanning</b> : loin du pic, la fuite tombe à ${db(d, far)}. En échange, le pic s’élargit.`,
            `<b>Hanning</b>: far from the peak, the leakage drops to ${db(d, far)}. In exchange, the peak gets wider.`));
        },
        async (d) => {
          await d.focus('plot1');
          await d.set('time-display', 'both');
          d.say(S('¿Cómo? La ventana multiplica el registro por una curva que vale 0 en los extremos (en azul, el registro con ventana): ya no termina con un corte brusco.',
            'Comment ? La fenêtre multiplie l’enregistrement par une courbe qui vaut 0 aux deux bouts (en bleu, l’enregistrement fenêtré) : il ne s’arrête plus brusquement.',
            'How? The window multiplies the record by a curve that is 0 at both ends (in blue, the windowed record): it no longer ends with an abrupt cut.'));
        },
        async (d) => {
          await d.focus('plot2');
          await d.clear('plot2');
          await d.set('window-type', 'blackman');
          const far = d.bar(1000);
          await d.draw('plot2', d.note(far.x, far.y == null ? -95 : far.y, db(d, far), { ay: -32 }));
          d.say(S(`<b>Blackman</b>: todavía menos fuga lejana (${db(d, far)} a 1000 Hz), con un pico aún más ancho.`,
            `<b>Blackman</b> : encore moins de fuite loin du pic (${db(d, far)} à 1 000 Hz), avec un pic encore plus large.`,
            `<b>Blackman</b>: even less leakage far from the peak (${db(d, far)} at 1000 Hz), with an even wider peak.`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('window-type', 'flattop');
          await d.set('y-scale', 'linear');
          await d.view('plot2', { x: [175, 825], y: [0, 7.6] }, 0);
          const [l, r] = d.top(2, 400, 600).sort((a, b) => a.x - b.x);
          await d.draw('plot2', d.hline(5, '5 V', { x: 0.01, x1: 0.74 }),
            d.note(l.x, l.y, d.volt(l.y), { ax: -40, ay: -22 }), d.note(r.x, r.y, d.volt(r.y), { ax: 40, ay: -22 }));
          const same = d.volt(l.y, 2) === d.volt(r.y, 2);
          const both = (and) => (same ? d.volt(l.y, 2) : `${d.volt(l.y, 2)} ${and} ${d.volt(r.y, 2)}`);
          d.say(S(`<b>Flat Top</b>: las dos barras más altas vuelven a ${both('y')}: la amplitud leída es la correcta. Es la ventana para <b>medir una amplitud</b>.`,
            `<b>Flat Top</b> : les deux plus hautes barres remontent à ${both('et')} : l’amplitude lue est de nouveau juste. C’est la fenêtre pour <b>mesurer une amplitude</b>.`,
            `<b>Flat Top</b>: the two highest bars are back to ${both('and')}: the amplitude read is right again. It is the window to <b>measure an amplitude</b>.`));
        },
        async (d) => {
          const [l, r] = d.top(2, 400, 600).sort((a, b) => a.x - b.x);
          const dfx = d.df();
          const nl = d.bar(l.x - dfx);
          const nr = d.bar(r.x + dfx);
          await d.draw('plot2', d.hline(5, '5 V', { x: 0.01, x1: 0.74 }),
            d.note(nl.x, nl.y, d.volt(nl.y, 2), { ax: -46, ay: -18 }), d.note(nr.x, nr.y, d.volt(nr.y, 2), { ax: 46, ay: -18 }));
          d.say(S(`El precio: un pico ancho, las barras vecinas todavía valen ${d.volt(nl.y, 2)}. Para medir una amplitud: Flat Top. Para separar dos frecuencias cercanas: un pico angosto, Rectangular o Hanning.`,
            `Le prix : un pic large, les barres voisines valent encore ${d.volt(nl.y, 2)}. Pour mesurer une amplitude : Flat Top. Pour séparer deux fréquences proches : un pic étroit, Rectangulaire ou Hanning.`,
            `The price: a wide peak, the neighbouring bars are still ${d.volt(nl.y, 2)}. To measure an amplitude: Flat Top. To separate two close frequencies: a narrow peak, Rectangular or Hanning.`));
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'noise', icon: '🌫️', seed: 39,
      t: S('Una sinusoide oculta en el ruido', 'Une sinusoïde cachée dans le bruit', 'A sine hidden in noise'),
      d: S('Invisible en el tiempo, evidente en el espectro… si el registro es lo bastante largo.',
        'Invisible dans le temps, évidente dans le spectre… si l’enregistrement est assez long.',
        'Invisible in time, obvious in the spectrum… if the record is long enough.'),
      async setup(d) {
        await d.config({ ...BASE, amplitude: 1, frequency: 1000, 'max-freq': 3000, cycles: 2, 'enable-noise': true, 'noise-level': 5000 });
        await d.view('plot1', 'auto');
        await d.view('plot2', 'auto');
        await d.view('plot2', { x: [-120, 3120], y: [0, 1.7] });
      },
      steps: [
        async (d) => {
          await d.focus('plot1');
          const xs = [];
          const ys = [];
          for (let i = 0; i <= 200; i++) {
            xs.push(0.002 * i / 200);
            ys.push(Math.sin(2 * Math.PI * 1000 * xs[i]));
          }
          await d.draw('plot1', d.curve(xs, ys, { width: 3 }));
          d.say(S('Una sinusoide de 1 V a 1000 Hz (en punteado amarillo) más un ruido de 5 V eficaces. En el tiempo, la sinusoide queda completamente oculta.',
            'Une sinusoïde de 1 V à 1 000 Hz (en pointillé jaune) plus un bruit de 5 V efficaces. Dans le temps, la sinusoïde est complètement cachée.',
            'A 1 V sine at 1000 Hz (yellow dots) plus a noise of 5 V RMS. In time, the sine is completely hidden.'));
        },
        async (d) => {
          await d.focus('plot2');
          const b = d.bar(1000);
          const other = d.top(1, -Infinity, Infinity).concat(d.top(3)).find((x) => Math.abs(x.x - 1000) > 1) || b;
          await d.draw('plot2', d.hline(1, '1 V', { x: 0.01, x1: 0.74 }),
            d.note(b.x, b.y, d.volt(b.y, 2), { ay: -26 }), d.note(other.x, other.y, d.volt(other.y, 2), { ay: -26 }));
          const taller = other.y > b.y;
          d.say(S(`2 períodos: ${TOBS} = 2 ms y ${DF} = 500 Hz, solo siete barras entre 0 y 3 kHz. La barra de 1000 Hz vale ${d.volt(b.y, 2)}, la de ${d.hz(other.x)} ${d.volt(other.y, 2)}: ${taller ? 'la más alta ni siquiera es la de la sinusoide' : 'imposible decir cuál es la sinusoide'}.`,
            `2 périodes : ${TOBS} = 2 ms et ${DF} = 500 Hz, seulement sept barres entre 0 et 3 kHz. La barre à 1 000 Hz vaut ${d.volt(b.y, 2)}, celle à ${d.hz(other.x)} ${d.volt(other.y, 2)} : ${taller ? 'la plus haute n’est même pas celle de la sinusoïde' : 'impossible de dire laquelle vient de la sinusoïde'}.`,
            `2 periods: ${TOBS} = 2 ms and ${DF} = 500 Hz, only seven bars between 0 and 3 kHz. The bar at 1000 Hz is ${d.volt(b.y, 2)}, the one at ${d.hz(other.x)} ${d.volt(other.y, 2)}: ${taller ? 'the highest one is not even the sine' : 'no way to tell which one is the sine'}.`));
        },
        async (d) => {
          await d.clear('plot1');
          await d.draw('plot2', d.hline(1, '1 V', { x: 0.01, x1: 0.74 }));
          d.say(S('Registremos más tiempo: 5, 10, 20, 50 y 100 períodos. Mira la barra de 1000 Hz.',
            'Enregistrons plus longtemps : 5, 10, 20, 50 et 100 périodes. Regardez la barre à 1 000 Hz.',
            'Let us record for longer: 5, 10, 20, 50 and 100 periods. Watch the bar at 1000 Hz.'));
          await d.wait(1500);
          await d.sweep('cycles', [5, 10, 20, 50, 100], 1300);
          d.hold = 1500;
        },
        async (d) => {
          const b = d.bar(1000);
          const rest = d.top(30).filter((x) => Math.abs(x.x - 1000) > 15)[0];
          await d.draw('plot2', d.hline(1, '1 V', { x: 0.01, x1: 0.74 }), d.note(b.x, b.y, d.volt(b.y, 2), { ax: 46, ay: -24 }));
          d.say(S(`100 períodos: ${TOBS} = 100 ms y ${DF} = 10 Hz. La barra de 1000 Hz vale ${d.volt(b.y, 2)}, la amplitud de la sinusoide; todas las demás quedan por debajo de ${d.volt(rest.y, 1)}.`,
            `100 périodes : ${TOBS} = 100 ms et ${DF} = 10 Hz. La barre à 1 000 Hz vaut ${d.volt(b.y, 2)}, l’amplitude de la sinusoïde ; toutes les autres restent sous ${d.volt(rest.y, 1)}.`,
            `100 periods: ${TOBS} = 100 ms and ${DF} = 10 Hz. The bar at 1000 Hz is ${d.volt(b.y, 2)}, the amplitude of the sine; all the others stay below ${d.volt(rest.y, 1)}.`));
        },
        async (d) => {
          await d.focus('plot1');
          await d.view('plot1', 'auto');
          d.say(S('En el tiempo, en cambio, nada mejoró: 100 ms de ruido, igual de ilegible. Es el espectro el que encuentra la sinusoide.',
            'Dans le temps, en revanche, rien ne s’est amélioré : 100 ms de bruit, toujours aussi illisible. C’est le spectre qui trouve la sinusoïde.',
            'In time, on the other hand, nothing got better: 100 ms of noise, just as unreadable. It is the spectrum that finds the sine.'));
        },
        async (d) => {
          await d.focus('plot2');
          d.say(S('¿Por qué? Cada barra es el promedio del registro multiplicado por un coseno. El producto del ruido cambia de signo al azar y se compensa en el promedio, tanto mejor cuanto más largo es el registro; el de la sinusoide no: queda 1 V.',
            'Pourquoi ? Chaque barre est la moyenne de l’enregistrement multiplié par un cosinus. Le produit du bruit change de signe au hasard et se compense dans la moyenne, d’autant mieux que l’enregistrement est long ; celui de la sinusoïde, non : il reste 1 V.',
            'Why? Each bar is the average of the record multiplied by a cosine. The product of the noise changes sign at random and cancels out in the average, the better the longer the record; the product of the sine does not: 1 V remains.'));
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'resolution', icon: '🔍', seed: 1,
      t: S('Dos frecuencias muy cercanas', 'Deux fréquences très proches', 'Two very close frequencies'),
      d: S('1000 Hz y 1030 Hz: cuánto tiempo hay que observar para separarlas. La relación entre $\\Delta f$ y $T_\\mathrm{obs}$.',
        '1 000 Hz et 1 030 Hz : combien de temps faut-il observer pour les séparer ? Le lien entre $\\Delta f$ et $T_\\mathrm{obs}$.',
        '1000 Hz and 1030 Hz: how long to observe to tell them apart. The link between $\\Delta f$ and $T_\\mathrm{obs}$.'),
      async setup(d) {
        await d.config({ ...BASE, amplitude: 2, frequency: 1000, 'max-freq': 2000, cycles: 10, 'enable-signal2': true, 'signal2-sine': true, amplitude2: 2, frequency2: 1030 });
        await d.view('plot1', 'auto');
        await d.view('plot2', 'auto');
        // on a phone the FFT box takes more width: the two lines stay to its left
        await d.view('plot2', { x: d.narrow() ? [850, 1400] : [780, 1250], y: [0, 4.4] });
      },
      steps: [
        async (d) => {
          await d.focus('plot2');
          await d.draw('plot2', d.vline(1000, '1000 Hz', { xanchor: 'right', top: true }), d.vline(1030, '1030 Hz', { top: true }));
          d.say(S('Dos sinusoides de 2 V, a 1000 Hz y a 1030 Hz (marcas amarillas arriba): están separadas por solo 30 Hz. ¿Las distingue el espectro?',
            'Deux sinusoïdes de 2 V, à 1 000 Hz et à 1 030 Hz (repères jaunes en haut) : elles ne sont séparées que de 30 Hz. Le spectre les distingue-t-il ?',
            'Two 2 V sines, at 1000 Hz and at 1030 Hz (yellow marks at the top): they are only 30 Hz apart. Does the spectrum tell them apart?'));
        },
        async (d) => {
          const df = d.df();
          await d.draw('plot2', d.vline(1000, '1000 Hz', { xanchor: 'right', top: true }), d.vline(1030, '1030 Hz', { top: true }),
            d.span(1100, 1200, 0.55, `${DF} = ${d.hz(df)}`, { tick: 0.14 }));
          d.say(S(`10 períodos: ${TOBS} = ${d.ms(d.tobs())} y ${DF} = ${d.hz(df)}, mucho más que 30 Hz. Las dos frecuencias caen entre las mismas barras: se ve <b>un solo pico</b>.`,
            `10 périodes : ${TOBS} = ${d.ms(d.tobs())} et ${DF} = ${d.hz(df)}, bien plus que 30 Hz. Les deux fréquences tombent entre les mêmes barres : on voit <b>un seul pic</b>.`,
            `10 periods: ${TOBS} = ${d.ms(d.tobs())} and ${DF} = ${d.hz(df)}, much more than 30 Hz. Both frequencies fall between the same bars: we see <b>a single peak</b>.`));
        },
        async (d) => {
          await d.draw('plot2', d.vline(1000, '1000 Hz', { xanchor: 'right', top: true }), d.vline(1030, '1030 Hz', { top: true }));
          await d.set('cycles', 30);
          const df = d.df();
          const x0 = d.bar(1130).x;
          await d.draw('plot2', d.vline(1000, '1000 Hz', { xanchor: 'right', top: true }), d.vline(1030, '1030 Hz', { top: true }),
            d.span(x0, x0 + df, 0.55, `${DF} = ${d.hz(df)}`, { tick: 0.14 }));
          d.say(S(`30 períodos: ${TOBS} = ${d.ms(d.tobs())} y ${DF} = ${d.hz(df)}, casi igual a 30 Hz: dos barras altas, pegadas.`,
            `30 périodes : ${TOBS} = ${d.ms(d.tobs())} et ${DF} = ${d.hz(df)}, presque égal à 30 Hz : deux hautes barres, collées.`,
            `30 periods: ${TOBS} = ${d.ms(d.tobs())} and ${DF} = ${d.hz(df)}, almost equal to 30 Hz: two high bars, side by side.`));
        },
        async (d) => {
          await d.draw('plot2', d.vline(1000, '1000 Hz', { xanchor: 'right', top: true }), d.vline(1030, '1030 Hz', { top: true }));
          await d.set('cycles', 100);
          const a = d.bar(1000);
          const b = d.bar(1030);
          await d.draw('plot2', d.note(a.x, a.y, d.volt(a.y, 2), { ax: -44, ay: -22 }), d.note(b.x, b.y, d.volt(b.y, 2), { ax: 44, ay: -22 }));
          d.say(S(`100 períodos: ${TOBS} = ${d.ms(d.tobs())} y ${DF} = ${d.hz(d.df())}, tres veces menos que 30 Hz: <b>dos picos bien separados</b>, de 2 V cada uno.`,
            `100 périodes : ${TOBS} = ${d.ms(d.tobs())} et ${DF} = ${d.hz(d.df())}, trois fois moins que 30 Hz : <b>deux pics bien séparés</b>, de 2 V chacun.`,
            `100 periods: ${TOBS} = ${d.ms(d.tobs())} and ${DF} = ${d.hz(d.df())}, three times less than 30 Hz: <b>two well separated peaks</b>, 2 V each.`));
        },
        async (d) => {
          await d.focus('plot1');
          await d.view('plot1', { y: [-4.6, 6.4] }, 0);
          await d.draw('plot1', d.span(1 / 60, 1 / 60 + 1 / 30, 4.7, '1/(30 Hz) ≈ 33 ms', { tick: 0.4 }));
          d.say(S('En el tiempo se ven batidos: la envolvente se repite cada 1/(1030 − 1000) s ≈ 33 ms. Para separar las dos frecuencias, hay que observar por lo menos un batido.',
            'Dans le temps, on voit des battements : l’enveloppe se répète toutes les 1/(1 030 − 1 000) s ≈ 33 ms. Pour séparer les deux fréquences, il faut observer au moins un battement.',
            'In time we see beats: the envelope repeats every 1/(1030 − 1000) s ≈ 33 ms. To separate the two frequencies, we must observe at least one beat.'));
        },
        async (d) => {
          await d.focus('plot2');
          d.say(S(`La regla: dos frecuencias se distinguen cuando ${DF} = $1/T_\\mathrm{obs}$ es más chico que la distancia entre ellas (30 Hz), es decir cuando ${TOBS} supera 1/30 s ≈ 33 ms; nítidamente cuando es varias veces mayor.`,
            `La règle : deux fréquences se distinguent quand ${DF} = $1/T_\\mathrm{obs}$ est plus petit que leur écart (30 Hz), c’est-à-dire quand ${TOBS} dépasse 1/30 s ≈ 33 ms ; nettement quand il est plusieurs fois plus grand.`,
            `The rule: two frequencies can be told apart when ${DF} = $1/T_\\mathrm{obs}$ is smaller than their distance (30 Hz), that is when ${TOBS} exceeds 1/30 s ≈ 33 ms; clearly when it is several times longer.`));
        }
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'units', icon: '📏', seed: 1,
      t: S('V cresta, V eficaz y dB', 'V crête, V efficace et dB', 'Peak V, RMS V and dB'),
      d: S('Qué mide la altura de una barra según la unidad elegida, como en el osciloscopio.',
        'Ce que mesure la hauteur d’une barre selon l’unité choisie, comme à l’oscilloscope.',
        'What the height of a bar measures in each unit, as on the oscilloscope.'),
      async setup(d) {
        await d.config({ ...BASE, amplitude: 10, frequency: 1000, 'max-freq': 3000, cycles: 10 });
        await d.view('plot1', 'auto');
        await d.view('plot1', { y: [-11, 19] });
        await d.view('plot2', 'auto');
        await d.view('plot2', { x: [-120, 3120], y: [0, 13] });
      },
      steps: [
        async (d) => {
          await d.focus('plot1');
          const rms = 10 / Math.SQRT2;
          await d.draw('plot1', d.hline(10), d.hline(rms, null),
            d.note(0.00175, 10, d.L(S('$V_\\mathrm{cresta}$ = 10 V', '$V_\\mathrm{crête}$ = 10 V', '$V_\\mathrm{peak}$ = 10 V')), { ay: -28 }),
            d.note(0.00775, rms, d.L(S('$V_\\mathrm{ef}$ = 10/√2 = 7,07 V', '$V_\\mathrm{eff}$ = 10/√2 = 7,07 V', '$V_\\mathrm{RMS}$ = 10/√2 = 7.07 V')), { ay: -64 }));
          d.say(S('Una sinusoide de amplitud de cresta 10 V. Su valor eficaz es $10/\\sqrt{2}$ = 7,07 V.',
            'Une sinusoïde d’amplitude de crête 10 V. Sa valeur efficace vaut $10/\\sqrt{2}$ = 7,07 V.',
            'A sine of peak amplitude 10 V. Its RMS value is $10/\\sqrt{2}$ = 7.07 V.'));
        },
        async (d) => {
          await d.focus('plot2');
          const b = d.bar(1000);
          await d.draw('plot2', d.note(b.x, b.y, d.volt(b.y, 3), { ax: 50, ay: -18 }));
          d.say(S('En el espectro, la barra de 1000 Hz da la <b>amplitud de cresta</b> de la sinusoide: 10 V.',
            'Dans le spectre, la barre à 1 000 Hz donne l’<b>amplitude de crête</b> de la sinusoïde : 10 V.',
            'In the spectrum, the bar at 1000 Hz gives the <b>peak amplitude</b> of the sine: 10 V.'));
        },
        async (d) => {
          await d.set('rms-mode', true);
          const b = d.bar(1000);
          await d.draw('plot2', d.note(b.x, b.y, d.unit(b.y, 'V', 3), { ax: 50, ay: -18 }));
          d.say(S(`Con «Valores eficaces», como con Unit: Vrms en el osciloscopio del TP, la misma barra vale ${d.volt(b.y, 3)} = $10/\\sqrt{2}$: el <b>valor eficaz</b>.`,
            `Avec « Valeurs efficaces », comme avec Unit : Vrms à l’oscilloscope du TP, la même barre vaut ${d.volt(b.y, 3)} = $10/\\sqrt{2}$ : la <b>valeur efficace</b>.`,
            `With “RMS values”, as with Unit: Vrms on the oscilloscope of the lab, the same bar is ${d.volt(b.y, 3)} = $10/\\sqrt{2}$: the <b>RMS value</b>.`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('y-scale', 'db');
          await d.view('plot2', { y: [-50, 32] }, 0);
          const b = d.bar(1000);
          await d.draw('plot2', d.note(b.x, b.y, `${dbNum(d, b)} dBV`, { ax: 56, ay: -16 }));
          d.say(S(`En <b>dB</b>, el eje da $20\\log_{10}(V / 1\\,\\mathrm{V})$: $20\\log_{10}(7{,}07)$ = ${dbNum(d, b)} dBV.`,
            `En <b>dB</b>, l’axe donne $20\\log_{10}(V / 1\\,\\mathrm{V})$ : $20\\log_{10}(7{,}07)$ = ${dbNum(d, b)} dBV.`,
            `In <b>dB</b>, the axis gives $20\\log_{10}(V / 1\\,\\mathrm{V})$: $20\\log_{10}(7.07)$ = ${dbNum(d, b)} dBV.`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('amplitude', 1);
          const b = d.bar(1000);
          await d.draw('plot2', d.hline(17, '17 dBV', { x: 0.01, x1: 0.74 }), d.note(b.x, b.y, `${dbNum(d, b)} dBV`, { ax: 56, ay: -16 }));
          d.say(S(`Amplitud dividida por 10: la barra baja <b>20 dB</b>, a ${dbNum(d, b)} dBV.`,
            `Amplitude divisée par 10 : la barre descend de <b>20 dB</b>, à ${dbNum(d, b)} dBV.`,
            `Amplitude divided by 10: the bar goes down <b>20 dB</b>, to ${dbNum(d, b)} dBV.`));
        },
        async (d) => {
          await d.clear('plot2');
          await d.set('amplitude', 0.1);
          const b = d.bar(1000);
          await d.draw('plot2', d.hline(17, '17 dBV', { x: 0.01, x1: 0.74 }), d.hline(-3, '−3 dBV', { x: 0.01, x1: 0.74 }), d.note(b.x, b.y, `${dbNum(d, b)} dBV`, { ax: 56, ay: -16 }));
          d.say(S(`Otra vez ÷ 10: ${dbNum(d, b)} dBV. En dB, cada factor 10 en tensión son 20 dB, y una barra 100 veces más chica se sigue leyendo sin problema.`,
            `Encore ÷ 10 : ${dbNum(d, b)} dBV. En dB, chaque facteur 10 en tension vaut 20 dB, et une barre 100 fois plus petite se lit encore sans peine.`,
            `÷ 10 again: ${dbNum(d, b)} dBV. In dB, each factor of 10 in voltage is 20 dB, and a bar 100 times smaller is still easy to read.`));
        }
      ]
    }
  ];
})();
