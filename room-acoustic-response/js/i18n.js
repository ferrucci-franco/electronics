/* ============================================================
 * i18n.js - Minimal internationalisation layer (no dependency).
 *
 * Usage:
 *   I18N.t('btn.start')                       -> translated string
 *   I18N.t('progress.remaining', {s: 12})     -> with {placeholders}
 *   I18N.apply()                              -> translates the DOM
 *   I18N.setLang('en')                        -> switch language
 *
 * DOM contract:
 *   <el data-i18n="key">              -> textContent = t(key)
 *   <el data-i18n-attr="title:key">   -> setAttribute('title', t(key))
 *
 * To add a language: copy the `en` block, translate the values, register
 * it under its ISO 639-1 code and add an <option> in index.html.
 * Missing keys silently fall back to French.
 * ============================================================ */
(function (global) {
  'use strict';

  var DEFAULT_LANG = 'fr';

  var STRINGS = {

    /* --------------------------------------------------- FRANCAIS */
    fr: {
      'app.title':    'Mesure de réponse acoustique',
      'app.subtitle': 'Balayage sinusoïdal logarithmique + enregistrement WAV non compressé',
      'lang.label':   'Langue',
      'theme.toDark':  'Passer en mode sombre',
      'theme.toLight': 'Passer en mode clair',

      'modes.title': 'Modes propres de la pièce',
      'modes.help':  'Dans une pièce rectangulaire, les ondes stationnaires entre parois créent des résonances : le niveau mesuré monte fortement à ces fréquences et s’effondre entre elles. Réglez les trois dimensions ci-dessous pour prédire où elles tombent, avant même de mesurer.',
      'modes.legend': 'c = 343 m/s (célérité du son à 20 °C) ; L, W, H = longueur, largeur, hauteur en mètres ; nx, ny, nz = entiers ≥ 0, non tous nuls.',
      'modes.L':      'Longueur (profondeur)',
      'modes.W':      'Largeur',
      'modes.H':      'Hauteur',
      'modes.volume': 'Volume',
      'modes.axialTitle': 'Fondamentales axiales',
      'modes.axialL': 'Longueur (1,0,0)',
      'modes.axialW': 'Largeur (0,1,0)',
      'modes.axialH': 'Hauteur (0,0,1)',
      'modes.stripTitle': 'Répartition (échelle logarithmique)',
      'modes.axial':      'Axial',
      'modes.tangential': 'Tangentiel',
      'modes.oblique':    'Oblique',
      'modes.strength':   'du plus fort au plus faible',
      'modes.tableTitle': 'Fréquences propres les plus basses',
      'modes.colF':    'Fréquence',
      'modes.colN':    'Ordre (nx, ny, nz)',
      'modes.colType': 'Type',
      'modes.hint':    'La fréquence propre la plus basse est {f} Hz. Pour la capturer, commencez le balayage en dessous (réglage « Fréquence initiale », plus bas).',
      'modes.note':    'Modèle idéalisé : parois parfaitement rigides, pièce parallélépipédique vide. Une pièce réelle (meubles, absorbants, parois souples) décale les résonances et surtout les élargit. À prendre comme repère de lecture du spectre, pas comme une vérité.',

      'warn.title':   'Avant de commencer',
      'warn.speaker': 'N’importe quel haut-parleur convient : celui du téléphone, une enceinte filaire ou une enceinte Bluetooth. Une enceinte séparée est nettement préférable, car elle éloigne la source du microphone : celui-ci mesure alors la pièce, et non le haut-parleur collé contre lui.',
      'warn.bt':      'Si vous utilisez une enceinte Bluetooth, connectez-la avant d’ouvrir cette page. Si le son sort de l’écouteur du téléphone, déconnectez puis reconnectez l’enceinte.',
      'warn.volume':  'Réglez le volume du haut-parleur et du téléphone à la main (environ 70 à 80 %). L’application ne modifie jamais le volume physique.',
      'warn.quiet':   'Placez-vous dans une pièce calme ; ne déplacez ni le téléphone ni le haut-parleur pendant la mesure.',

      'instr.title': 'Déroulement',
      'instr.1': 'Placez le haut-parleur, puis réglez son volume manuellement.',
      'instr.2': 'Testez le microphone : la barre de niveau doit réagir quand vous parlez.',
      'instr.3': 'Posez le téléphone au point de mesure, à l’écart du haut-parleur, microphone dégagé.',
      'instr.4': 'Appuyez sur « Démarrer la mesure » et restez silencieux pendant toute la durée.',
      'instr.5': 'Attendez le message « Terminé ».',
      'instr.6': 'Téléchargez le fichier WAV puis le fichier de métadonnées JSON.',

      'step1.title': '1. Vérification du microphone',
      'step1.help':  'Le navigateur va demander l’autorisation d’accès au microphone. Parlez ou frappez dans vos mains : la barre doit bouger.',
      'btn.testMic':  'Tester le microphone',
      'btn.stopTest': 'Arrêter le test',

      'mic.deviceLabel': 'Microphone utilisé :',
      'mic.unknown':     'nom non communiqué par le navigateur',
      'mic.selectLabel': 'Périphérique d’entrée',
      'mic.default':     'Choix du système',
      'mic.needTest':    'Autorisez le microphone pour voir la liste des périphériques.',

      'meter.peak':   'Crête',
      'meter.rms':    'RMS',
      'meter.hint':   'Une crête entre −20 et −6 dBFS pendant la parole est correcte.',
      'meter.ok':     'Microphone actif, signal détecté.',
      'meter.silent': 'Aucun signal détecté — vérifiez le microphone choisi.',
      'meter.clip':   'Saturation ! Éloignez la source ou baissez le volume.',

      'mode.label':    'Type de mesure',
      'mode.sweep':    'Balayage',
      'mode.sweepSub': 'l’application joue le signal',
      'mode.clap':     'Claquement',
      'mode.clapSub':  'vous frappez dans vos mains',

      'clap.help':     'Rien n’est joué : vous claquez des mains une fois, sec et fort, et l’application enregistre la décroissance de la salle. L’enregistrement démarre tout seul au claquement.',
      'btn.startClap': 'Armer l’enregistrement',
      'status.waitClap': 'Prêt — claquez des mains une fois, fort et sec.',
      'clap.armed':    'En attente du claquement…',
      'err.noClap':    'aucun claquement détecté. Claquez plus fort, ou baissez le seuil de déclenchement.',

      'settings.clapDur': 'Durée enregistrée',
      'settings.clapThr': 'Seuil de déclenchement',
      'settings.clapPre': 'Pré-enregistrement',

      'decay.title':   'Décroissance de la salle (microphone local)',
      'decay.mic':     'Capté par le microphone de cet appareil : {device}',
      'decay.computing': 'Analyse de la décroissance…',
      'decay.none':    'Décroissance inexploitable : le claquement était trop faible, ou la salle trop bruyante.',
      'decay.rt60':    'RT60',
      'decay.edt':     'EDT',
      'decay.t20':     'T20',
      'decay.t30':     'T30',
      'decay.range':   'Marge utile',
      'decay.note':    'Intégration inverse de Schroeder de la réponse impulsionnelle, puis droite ajustée sur la courbe. Estimation retenue : {best} ({r2}). Marge utile {range} dB au-dessus du bruit de fond. Un claquement ne donne PAS de réponse en fréquence : son propre spectre est inconnu et se multiplie à celui de la salle. La décroissance, elle, ne dépend que de la salle.',
      'decay.short':   'Attention : la marge au-dessus du bruit de fond ({range} dB) est trop faible pour un {name} fiable. Claquez plus fort, rapprochez-vous, ou attendez une salle plus calme.',
      'decay.axisT':   'Temps (s)',

      'step2.title': '2. Mesure',
      'step2.help':  'Balayage {f1} → {f2} Hz. Durée totale : {total} s (silence {pre} s + balayage {dur} s + silence {post} s).',
      'step2.helpPlain': 'Balayage {f1} → {f2} Hz, durée {dur} s.',
      'btn.start':   'Démarrer la mesure',
      'btn.abort':   'Annuler la mesure',
      'progress.remaining': 'Temps restant : {s} s',

      'spec.title':     'Aperçu de la réponse en amplitude',
      'spec.mic':       'Capté par le microphone de cet appareil : {device}',
      'spec.micUnknown': 'microphone local de cet appareil',
      'spec.computing': 'Analyse du signal…',
      'spec.none':      'Signal insuffisant pour tracer une courbe exploitable.',
      'spec.note':      'Rapport des densités spectrales entre l’enregistrement et le signal de référence. La courbe contient le haut-parleur, la pièce ET le microphone : ce n’est pas une mesure calibrée. Seule sa forme compte, pas son niveau absolu — les bosses sont les résonances. Résolution {bin} Hz, lissage 1/6 d’octave, {seg} fenêtres moyennées.',
      'spec.axisHz':    'Fréquence (Hz)',
      'spec.axisDb':    'dB (relatif)',

      'step3.title': '3. Téléchargements',
      'step3.empty': 'Aucune mesure disponible pour l’instant.',
      'step3.hint':  'Le WAV et le JSON portent le même identifiant de mesure. Conservez-les ensemble.',
      'btn.wav':     'Télécharger le fichier WAV',
      'btn.json':    'Télécharger les métadonnées (JSON)',
      'btn.ref':     'Télécharger le signal de référence (WAV)',
      'res.summary': 'Enregistrement : {dur} s · {sr} Hz · {bits} · {size} · crête {peak} dBFS',
      'res.clipped': 'Attention : le signal enregistré sature. Baissez le volume de l’enceinte et recommencez.',
      'res.low':     'Attention : niveau enregistré très faible ({peak} dBFS). Montez le volume de l’enceinte ou rapprochez le téléphone.',

      'settings.title':  'Paramètres avancés',
      'settings.f1':     'Fréquence initiale',
      'settings.f2':     'Fréquence finale',
      'settings.dur':    'Durée du balayage',
      'settings.amp':    'Amplitude numérique',
      'settings.pre':    'Silence avant',
      'settings.post':   'Silence après',
      'settings.format': 'Format du fichier WAV',
      'settings.format16': 'PCM entier 16 bits',
      'settings.format32': 'Virgule flottante 32 bits',
      'settings.sr':     'Taux d’échantillonnage (imposé)',
      'settings.reset':  'Rétablir les valeurs par défaut',
      'settings.note':   'Le taux d’échantillonnage est imposé par le système ; il est relevé et inscrit dans les métadonnées.',

      'status.idle':       'Prêt.',
      'status.permission': 'Demande d’autorisation du microphone…',
      'status.micOn':      'Test du microphone en cours…',
      'status.micOff':     'Test du microphone arrêté.',
      'status.preparing':  'Préparation…',
      'status.playing':    'Enregistrement et lecture en cours — ne parlez pas.',
      'status.finishing':  'Finalisation du fichier…',
      'status.done':       'Terminé.',
      'status.aborted':    'Mesure annulée.',
      'status.error':      'Erreur : {msg}',

      'err.noGetUserMedia': 'Ce navigateur ne permet pas l’accès au microphone.',
      'err.https':          'La page doit être servie en HTTPS (ou depuis localhost) pour accéder au microphone.',
      'err.denied':         'Autorisation du microphone refusée. Réactivez-la dans les réglages du navigateur.',
      'err.notFound':       'Aucun microphone disponible.',
      'err.busy':           'Le microphone est déjà utilisé par une autre application.',
      'err.generic':        'Échec de l’accès au microphone.',
      'err.params':         'Paramètres invalides : {msg}',
      'err.f1f2':           'la fréquence finale doit être supérieure à la fréquence initiale.',
      'err.nyquist':        'la fréquence finale dépasse la limite de Nyquist ({max} Hz).',
      'err.range':          'valeur hors limites.',
      'err.empty':          'aucun échantillon capturé — le microphone n’a rien fourni.',

      'foot.note': 'Application entièrement locale : aucun son n’est envoyé sur un serveur.'
    },

    /* ---------------------------------------------------- ENGLISH */
    en: {
      'app.title':    'Room response measurement',
      'app.subtitle': 'Logarithmic sine sweep + uncompressed WAV recording',
      'lang.label':   'Language',
      'theme.toDark':  'Switch to dark mode',
      'theme.toLight': 'Switch to light mode',

      'modes.title': 'Room modes',
      'modes.help':  'In a rectangular room, standing waves between the walls create resonances: the measured level rises sharply at those frequencies and collapses between them. Set the three dimensions below to predict where they fall, before you even measure.',
      'modes.legend': 'c = 343 m/s (speed of sound at 20 °C); L, W, H = length, width, height in metres; nx, ny, nz = integers ≥ 0, not all zero.',
      'modes.L':      'Length (depth)',
      'modes.W':      'Width',
      'modes.H':      'Height',
      'modes.volume': 'Volume',
      'modes.axialTitle': 'Axial fundamentals',
      'modes.axialL': 'Length (1,0,0)',
      'modes.axialW': 'Width (0,1,0)',
      'modes.axialH': 'Height (0,0,1)',
      'modes.stripTitle': 'Distribution (logarithmic scale)',
      'modes.axial':      'Axial',
      'modes.tangential': 'Tangential',
      'modes.oblique':    'Oblique',
      'modes.strength':   'from strongest to weakest',
      'modes.tableTitle': 'Lowest room-mode frequencies',
      'modes.colF':    'Frequency',
      'modes.colN':    'Order (nx, ny, nz)',
      'modes.colType': 'Type',
      'modes.hint':    'The lowest room mode is {f} Hz. To capture it, start the sweep below that (the “Start frequency” setting further down).',
      'modes.note':    'Idealised model: perfectly rigid walls, empty rectangular room. A real room (furniture, absorbers, flexible walls) shifts the resonances and, above all, broadens them. Use it as a guide for reading the spectrum, not as ground truth.',

      'warn.title':   'Before you start',
      'warn.speaker': 'Any loudspeaker will do: the phone itself, a wired speaker or a Bluetooth speaker. A separate speaker is clearly preferable, because it moves the source away from the microphone: the microphone then measures the room, not the loudspeaker pressed against it.',
      'warn.bt':      'If you use a Bluetooth speaker, connect it before opening this page. If sound comes out of the phone earpiece, disconnect and reconnect the speaker.',
      'warn.volume':  'Set the speaker and phone volume by hand (about 70 to 80 %). This app never changes the physical volume.',
      'warn.quiet':   'Use a quiet room; do not move the phone or the speaker during the measurement.',

      'instr.title': 'Procedure',
      'instr.1': 'Place the loudspeaker, then set its volume manually.',
      'instr.2': 'Test the microphone: the level bar must react when you speak.',
      'instr.3': 'Place the phone at the measurement point, away from the speaker, microphone unobstructed.',
      'instr.4': 'Press "Start measurement" and stay silent for the whole duration.',
      'instr.5': 'Wait for the "Done" message.',
      'instr.6': 'Download the WAV file and the JSON metadata file.',

      'step1.title': '1. Microphone check',
      'step1.help':  'The browser will ask for microphone permission. Speak or clap: the bar must move.',
      'btn.testMic':  'Test the microphone',
      'btn.stopTest': 'Stop the test',

      'mic.deviceLabel': 'Microphone in use:',
      'mic.unknown':     'name not reported by the browser',
      'mic.selectLabel': 'Input device',
      'mic.default':     'System default',
      'mic.needTest':    'Grant microphone access to see the device list.',

      'meter.peak':   'Peak',
      'meter.rms':    'RMS',
      'meter.hint':   'A peak between −20 and −6 dBFS while speaking is fine.',
      'meter.ok':     'Microphone active, signal detected.',
      'meter.silent': 'No signal detected — check the selected microphone.',
      'meter.clip':   'Clipping! Move away from the source or lower the volume.',

      'mode.label':    'Measurement type',
      'mode.sweep':    'Sweep',
      'mode.sweepSub': 'the app plays the signal',
      'mode.clap':     'Clap',
      'mode.clapSub':  'you clap your hands',

      'clap.help':     'Nothing is played: you clap your hands once, sharp and loud, and the app records the room decaying. Recording starts by itself on the clap.',
      'btn.startClap': 'Arm the recording',
      'status.waitClap': 'Ready — clap your hands once, hard and sharp.',
      'clap.armed':    'Waiting for the clap…',
      'err.noClap':    'no clap detected. Clap louder, or lower the trigger threshold.',

      'settings.clapDur': 'Recorded length',
      'settings.clapThr': 'Trigger threshold',
      'settings.clapPre': 'Pre-roll',

      'decay.title':   'Room decay (local microphone)',
      'decay.mic':     'Captured by this device’s own microphone: {device}',
      'decay.computing': 'Analysing the decay…',
      'decay.none':    'Decay unusable: the clap was too quiet, or the room too noisy.',
      'decay.rt60':    'RT60',
      'decay.edt':     'EDT',
      'decay.t20':     'T20',
      'decay.t30':     'T30',
      'decay.range':   'Usable range',
      'decay.note':    'Schroeder backward integration of the impulse response, then a straight line fitted to the curve. Estimate used: {best} ({r2}). Usable range {range} dB above the noise floor. A clap does NOT give a frequency response: its own spectrum is unknown and multiplies the room’s. The decay, on the other hand, depends on the room alone.',
      'decay.short':   'Careful: the margin above the noise floor ({range} dB) is too small for a reliable {name}. Clap louder, move closer, or wait for a quieter room.',
      'decay.axisT':   'Time (s)',

      'step2.title': '2. Measurement',
      'step2.help':  'Sweep {f1} → {f2} Hz. Total duration: {total} s (silence {pre} s + sweep {dur} s + silence {post} s).',
      'step2.helpPlain': 'Sweep {f1} → {f2} Hz, duration {dur} s.',
      'btn.start':   'Start measurement',
      'btn.abort':   'Cancel measurement',
      'progress.remaining': 'Time left: {s} s',

      'spec.title':     'Amplitude response preview',
      'spec.mic':       'Captured by this device’s own microphone: {device}',
      'spec.micUnknown': 'this device’s local microphone',
      'spec.computing': 'Analysing the signal…',
      'spec.none':      'Not enough signal to draw a usable curve.',
      'spec.note':      'Ratio of the spectral densities of the recording and of the reference signal. The curve contains the loudspeaker, the room AND the microphone: it is not a calibrated measurement. Only its shape means anything, not its absolute level — the bumps are the resonances. Resolution {bin} Hz, 1/6-octave smoothing, {seg} windows averaged.',
      'spec.axisHz':    'Frequency (Hz)',
      'spec.axisDb':    'dB (relative)',

      'step3.title': '3. Downloads',
      'step3.empty': 'No measurement available yet.',
      'step3.hint':  'The WAV and the JSON share the same measurement id. Keep them together.',
      'btn.wav':     'Download the WAV file',
      'btn.json':    'Download the metadata (JSON)',
      'btn.ref':     'Download the reference signal (WAV)',
      'res.summary': 'Recording: {dur} s · {sr} Hz · {bits} · {size} · peak {peak} dBFS',
      'res.clipped': 'Warning: the recording clips. Lower the speaker volume and measure again.',
      'res.low':     'Warning: very low recorded level ({peak} dBFS). Raise the speaker volume or move the phone closer.',

      'settings.title':  'Advanced settings',
      'settings.f1':     'Start frequency',
      'settings.f2':     'End frequency',
      'settings.dur':    'Sweep duration',
      'settings.amp':    'Digital amplitude',
      'settings.pre':    'Leading silence',
      'settings.post':   'Trailing silence',
      'settings.format': 'WAV format',
      'settings.format16': '16-bit integer PCM',
      'settings.format32': '32-bit floating point',
      'settings.sr':     'Sample rate (imposed)',
      'settings.reset':  'Restore defaults',
      'settings.note':   'The sample rate is imposed by the operating system; it is read back and written into the metadata.',

      'status.idle':       'Ready.',
      'status.permission': 'Requesting microphone permission…',
      'status.micOn':      'Microphone test running…',
      'status.micOff':     'Microphone test stopped.',
      'status.preparing':  'Preparing…',
      'status.playing':    'Recording and playing — please stay silent.',
      'status.finishing':  'Finalising the file…',
      'status.done':       'Done.',
      'status.aborted':    'Measurement cancelled.',
      'status.error':      'Error: {msg}',

      'err.noGetUserMedia': 'This browser cannot access the microphone.',
      'err.https':          'The page must be served over HTTPS (or from localhost) to access the microphone.',
      'err.denied':         'Microphone permission denied. Re-enable it in the browser settings.',
      'err.notFound':       'No microphone available.',
      'err.busy':           'The microphone is already used by another application.',
      'err.generic':        'Could not access the microphone.',
      'err.params':         'Invalid parameters: {msg}',
      'err.f1f2':           'the end frequency must be higher than the start frequency.',
      'err.nyquist':        'the end frequency exceeds the Nyquist limit ({max} Hz).',
      'err.range':          'value out of range.',
      'err.empty':          'no samples captured — the microphone returned nothing.',

      'foot.note': 'Fully local application: no audio is sent to any server.'
    },

    /* ---------------------------------------------------- ESPANOL */
    es: {
      'app.title':    'Medida de respuesta acústica',
      'app.subtitle': 'Barrido sinusoidal logarítmico + grabación WAV sin compresión',
      'lang.label':   'Idioma',
      'theme.toDark':  'Cambiar a modo oscuro',
      'theme.toLight': 'Cambiar a modo claro',

      'modes.title': 'Modos propios de la sala',
      'modes.help':  'En una sala rectangular, las ondas estacionarias entre paredes crean resonancias: el nivel medido sube mucho en esas frecuencias y se hunde entre ellas. Ajuste las tres dimensiones para predecir dónde caen, antes incluso de medir.',
      'modes.legend': 'c = 343 m/s (velocidad del sonido a 20 °C); L, W, H = largo, ancho, alto en metros; nx, ny, nz = enteros ≥ 0, no todos nulos.',
      'modes.L':      'Largo (profundidad)',
      'modes.W':      'Ancho',
      'modes.H':      'Alto',
      'modes.volume': 'Volumen',
      'modes.axialTitle': 'Fundamentales axiales',
      'modes.axialL': 'Largo (1,0,0)',
      'modes.axialW': 'Ancho (0,1,0)',
      'modes.axialH': 'Alto (0,0,1)',
      'modes.stripTitle': 'Distribución (escala logarítmica)',
      'modes.axial':      'Axial',
      'modes.tangential': 'Tangencial',
      'modes.oblique':    'Oblicuo',
      'modes.strength':   'del más fuerte al más débil',
      'modes.tableTitle': 'Frecuencias propias más bajas',
      'modes.colF':    'Frecuencia',
      'modes.colN':    'Orden (nx, ny, nz)',
      'modes.colType': 'Tipo',
      'modes.hint':    'La frecuencia propia más baja es {f} Hz. Para captarla, empiece el barrido por debajo (ajuste «Frecuencia inicial», más abajo).',
      'modes.note':    'Modelo idealizado: paredes perfectamente rígidas, sala rectangular vacía. Una sala real (muebles, absorbentes, paredes flexibles) desplaza las resonancias y sobre todo las ensancha. Úselo como guía para leer el espectro, no como verdad absoluta.',

      'warn.title':   'Antes de empezar',
      'warn.speaker': 'Sirve cualquier altavoz: el del propio teléfono, uno con cable o uno Bluetooth. Un altavoz separado es claramente preferible, porque aleja la fuente del micrófono: así el micrófono mide la sala y no el altavoz pegado a él.',
      'warn.bt':      'Si usa un altavoz Bluetooth, conéctelo antes de abrir esta página. Si el sonido sale por el auricular del teléfono, desconecte y vuelva a conectar el altavoz.',
      'warn.volume':  'Ajuste a mano el volumen del altavoz y del teléfono (en torno al 70-80 %). La aplicación nunca modifica el volumen físico.',
      'warn.quiet':   'Use una sala silenciosa; no mueva el teléfono ni el altavoz durante la medida.',

      'instr.title': 'Procedimiento',
      'instr.1': 'Coloque el altavoz y ajuste su volumen manualmente.',
      'instr.2': 'Pruebe el micrófono: la barra de nivel debe reaccionar al hablar.',
      'instr.3': 'Coloque el teléfono en el punto de medida, apartado del altavoz y con el micrófono despejado.',
      'instr.4': 'Pulse «Iniciar medición» y permanezca en silencio durante toda la medida.',
      'instr.5': 'Espere el mensaje «Finalizado».',
      'instr.6': 'Descargue el archivo WAV y el archivo JSON de metadatos.',

      'step1.title': '1. Comprobación del micrófono',
      'step1.help':  'El navegador pedirá permiso de acceso al micrófono. Hable o dé una palmada: la barra debe moverse.',
      'btn.testMic':  'Probar el micrófono',
      'btn.stopTest': 'Detener la prueba',

      'mic.deviceLabel': 'Micrófono en uso:',
      'mic.unknown':     'nombre no facilitado por el navegador',
      'mic.selectLabel': 'Dispositivo de entrada',
      'mic.default':     'Predeterminado del sistema',
      'mic.needTest':    'Conceda acceso al micrófono para ver la lista de dispositivos.',

      'meter.peak':   'Pico',
      'meter.rms':    'RMS',
      'meter.hint':   'Un pico entre −20 y −6 dBFS al hablar es correcto.',
      'meter.ok':     'Micrófono activo, señal detectada.',
      'meter.silent': 'No se detecta señal — revise el micrófono seleccionado.',
      'meter.clip':   '¡Saturación! Aléjese de la fuente o baje el volumen.',

      'mode.label':    'Tipo de medida',
      'mode.sweep':    'Barrido',
      'mode.sweepSub': 'la aplicación reproduce la señal',
      'mode.clap':     'Palmada',
      'mode.clapSub':  'usted da una palmada',

      'clap.help':     'No se reproduce nada: usted da una sola palmada, seca y fuerte, y la aplicación graba cómo decae la sala. La grabación arranca sola con la palmada.',
      'btn.startClap': 'Armar la grabación',
      'status.waitClap': 'Preparado — dé una palmada fuerte y seca.',
      'clap.armed':    'Esperando la palmada…',
      'err.noClap':    'no se detectó ninguna palmada. Dé una palmada más fuerte o baje el umbral de disparo.',

      'settings.clapDur': 'Duración grabada',
      'settings.clapThr': 'Umbral de disparo',
      'settings.clapPre': 'Pregrabación',

      'decay.title':   'Decaimiento de la sala (micrófono local)',
      'decay.mic':     'Captado por el micrófono propio de este dispositivo: {device}',
      'decay.computing': 'Analizando el decaimiento…',
      'decay.none':    'Decaimiento inservible: la palmada fue demasiado débil, o la sala demasiado ruidosa.',
      'decay.rt60':    'RT60',
      'decay.edt':     'EDT',
      'decay.t20':     'T20',
      'decay.t30':     'T30',
      'decay.range':   'Margen útil',
      'decay.note':    'Integración inversa de Schroeder de la respuesta al impulso, y luego una recta ajustada a la curva. Estimación usada: {best} ({r2}). Margen útil de {range} dB sobre el ruido de fondo. Una palmada NO da respuesta en frecuencia: su propio espectro es desconocido y se multiplica por el de la sala. El decaimiento, en cambio, depende solo de la sala.',
      'decay.short':   'Atención: el margen sobre el ruido de fondo ({range} dB) es demasiado pequeño para un {name} fiable. Dé una palmada más fuerte, acérquese, o espere a que la sala esté más tranquila.',
      'decay.axisT':   'Tiempo (s)',

      'step2.title': '2. Medición',
      'step2.help':  'Barrido {f1} → {f2} Hz. Duración total: {total} s (silencio {pre} s + barrido {dur} s + silencio {post} s).',
      'step2.helpPlain': 'Barrido {f1} → {f2} Hz, duración {dur} s.',
      'btn.start':   'Iniciar medición',
      'btn.abort':   'Cancelar medición',
      'progress.remaining': 'Tiempo restante: {s} s',

      'spec.title':     'Vista previa de la respuesta en amplitud',
      'spec.mic':       'Captado por el micrófono propio de este dispositivo: {device}',
      'spec.micUnknown': 'micrófono local de este dispositivo',
      'spec.computing': 'Analizando la señal…',
      'spec.none':      'Señal insuficiente para trazar una curva utilizable.',
      'spec.note':      'Cociente de las densidades espectrales de la grabación y de la señal de referencia. La curva contiene el altavoz, la sala Y el micrófono: no es una medida calibrada. Solo importa su forma, no su nivel absoluto — los picos son las resonancias. Resolución {bin} Hz, suavizado de 1/6 de octava, {seg} ventanas promediadas.',
      'spec.axisHz':    'Frecuencia (Hz)',
      'spec.axisDb':    'dB (relativo)',

      'step3.title': '3. Descargas',
      'step3.empty': 'Todavía no hay ninguna medición disponible.',
      'step3.hint':  'El WAV y el JSON comparten el mismo identificador de medición. Consérvelos juntos.',
      'btn.wav':     'Descargar el archivo WAV',
      'btn.json':    'Descargar los metadatos (JSON)',
      'btn.ref':     'Descargar la señal de referencia (WAV)',
      'res.summary': 'Grabación: {dur} s · {sr} Hz · {bits} · {size} · pico {peak} dBFS',
      'res.clipped': 'Aviso: la grabación satura. Baje el volumen del altavoz y repita la medida.',
      'res.low':     'Aviso: nivel grabado muy bajo ({peak} dBFS). Suba el volumen del altavoz o acerque el teléfono.',

      'settings.title':  'Parámetros avanzados',
      'settings.f1':     'Frecuencia inicial',
      'settings.f2':     'Frecuencia final',
      'settings.dur':    'Duración del barrido',
      'settings.amp':    'Amplitud digital',
      'settings.pre':    'Silencio inicial',
      'settings.post':   'Silencio final',
      'settings.format': 'Formato del archivo WAV',
      'settings.format16': 'PCM entero de 16 bits',
      'settings.format32': 'Coma flotante de 32 bits',
      'settings.sr':     'Frecuencia de muestreo (impuesta)',
      'settings.reset':  'Restablecer valores por defecto',
      'settings.note':   'La frecuencia de muestreo la impone el sistema operativo; se lee y se anota en los metadatos.',

      'status.idle':       'Preparado.',
      'status.permission': 'Solicitando permiso del micrófono…',
      'status.micOn':      'Prueba de micrófono en curso…',
      'status.micOff':     'Prueba de micrófono detenida.',
      'status.preparing':  'Preparando…',
      'status.playing':    'Grabando y reproduciendo — guarde silencio.',
      'status.finishing':  'Finalizando el archivo…',
      'status.done':       'Finalizado.',
      'status.aborted':    'Medición cancelada.',
      'status.error':      'Error: {msg}',

      'err.noGetUserMedia': 'Este navegador no permite acceder al micrófono.',
      'err.https':          'La página debe servirse por HTTPS (o desde localhost) para acceder al micrófono.',
      'err.denied':         'Permiso de micrófono denegado. Vuelva a activarlo en los ajustes del navegador.',
      'err.notFound':       'No hay ningún micrófono disponible.',
      'err.busy':           'El micrófono ya lo está usando otra aplicación.',
      'err.generic':        'No se pudo acceder al micrófono.',
      'err.params':         'Parámetros no válidos: {msg}',
      'err.f1f2':           'la frecuencia final debe ser mayor que la inicial.',
      'err.nyquist':        'la frecuencia final supera el límite de Nyquist ({max} Hz).',
      'err.range':          'valor fuera de rango.',
      'err.empty':          'no se capturó ninguna muestra — el micrófono no entregó datos.',

      'foot.note': 'Aplicación totalmente local: no se envía ningún audio a ningún servidor.'
    }
  };

  var current = DEFAULT_LANG;

  /** Translate `key`, substituting {placeholders} taken from `vars`. */
  function t(key, vars) {
    var table = STRINGS[current] || STRINGS[DEFAULT_LANG];
    var s = table[key];
    if (s === undefined) { s = STRINGS[DEFAULT_LANG][key]; }
    if (s === undefined) { return key; }        // untranslated keys stay visible
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) {
        return (vars[k] !== undefined && vars[k] !== null) ? String(vars[k]) : m;
      });
    }
    return s;
  }

  /** Translate every [data-i18n] / [data-i18n-attr] node under `root`. */
  function apply(root) {
    root = root || document;

    var nodes = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }

    // format: data-i18n-attr="title:some.key, placeholder:other.key"
    var attrNodes = root.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrNodes.length; j++) {
      var spec = attrNodes[j].getAttribute('data-i18n-attr').split(',');
      for (var k = 0; k < spec.length; k++) {
        var pair = spec[k].split(':');
        if (pair.length === 2) {
          attrNodes[j].setAttribute(pair[0].trim(), t(pair[1].trim()));
        }
      }
    }

    document.documentElement.lang = current;
    document.title = t('app.title');
  }

  /** Switch language, re-translate the DOM and notify the application. */
  function setLang(lang) {
    if (!STRINGS[lang]) { return false; }
    current = lang;
    try { localStorage.setItem('rira.lang', lang); } catch (e) { /* private mode */ }
    apply();
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: lang } }));
    return true;
  }

  /** Stored preference > browser language > default. */
  function detect() {
    var stored = null;
    try { stored = localStorage.getItem('rira.lang'); } catch (e) { /* ignore */ }
    if (stored && STRINGS[stored]) { return stored; }
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    var code = String(nav).slice(0, 2).toLowerCase();
    return STRINGS[code] ? code : DEFAULT_LANG;
  }

  global.I18N = {
    t: t,
    apply: apply,
    setLang: setLang,
    detect: detect,
    getLang: function () { return current; },
    available: Object.keys(STRINGS),
    DEFAULT_LANG: DEFAULT_LANG
  };

})(window);
