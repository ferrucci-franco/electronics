# Mesure de réponse acoustique — application web statique

Aplicación web **100 % estática** (sin servidor, sin build, sin `node_modules`) para un curso
de tratamiento de señales. Reproduce un **barrido sinusoidal logarítmico** por la salida de
audio activa mientras **graba simultáneamente** con el micrófono, y entrega un
**WAV sin compresión** más un **JSON de metadatos**.

**El Bluetooth no es obligatorio.** Sirve cualquier altavoz: el del propio teléfono, uno con
cable o uno Bluetooth. Ahora bien, un **altavoz separado es claramente preferible**, y esa es
la razón por la que la interfaz lo recomienda: aleja la fuente del micrófono. Con el altavoz
integrado, el micrófono está a pocos centímetros del transductor, así que el sonido directo
domina por completo y aplasta la contribución de la sala; además el acoplamiento mecánico por
el chasis del teléfono introduce vibración que no tiene nada que ver con la acústica que se
quiere medir. Con un altavoz separado, el micrófono mide la sala y no el altavoz pegado a él.

Interfaz en **francés** por defecto, con inglés y español incluidos e infraestructura de
i18n lista para añadir más idiomas.

---

## 1. Despliegue en GitHub Pages

```bash
git init && git add -A && git commit -m "Application de mesure acoustique"
git branch -M main && git remote add origin git@github.com:USUARIO/REPO.git && git push -u origin main
```

Después, en el repositorio: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**.

No hace falta nada más: no hay build, no hay `node_modules`, no hay rutas absolutas.
El archivo `.nojekyll` evita que Jekyll procese el sitio.

> **HTTPS es obligatorio.** `getUserMedia()` solo funciona en contexto seguro. GitHub Pages
> sirve por HTTPS, así que está cubierto. Abrir `index.html` con `file://` muestra la página
> pero el micrófono queda deshabilitado (la app lo detecta y lo dice).

### Prueba local

```bash
python -m http.server 8123
```

Luego abrir `http://localhost:8123` (localhost cuenta como contexto seguro).
También hay un `.claude/launch.json` con esa misma configuración para el panel de vista previa.

---

## 2. Estructura

```
index.html          Estructura de la interfaz (todos los textos vienen de i18n)
css/style.css       Estilos: mobile-first, botones grandes, temas claro y oscuro
js/i18n.js          Diccionarios fr/en/es + traducción del DOM
js/wav.js           Escritor RIFF/WAVE en JS (PCM 16 bits e IEEE float 32 bits)
js/chirp.js         Generador de barrido exponencial + validación de parámetros
js/modes.js         Modos propios de una sala rectangular (modelo de Rayleigh)
js/spectrum.js      FFT + Welch: vista previa de la respuesta en amplitud
js/decay.js         Schroeder + RT60: decaimiento a partir de una palmada
js/audio.js         Motor de audio: permisos, vúmetro, reproducción+grabación
js/app.js           Controlador de interfaz, máquina de estados, descargas
.nojekyll           Para GitHub Pages
```

**Única dependencia externa: KaTeX**, cargada desde CDN con versión fijada (`0.16.11`) y
`integrity` SRI, y usada solo para tipografiar la fórmula de la tarjeta de modos. Se carga con
`defer`, así que está lista antes de que arranque `app.js`. Si el CDN no responde —sin conexión,
o abriendo la página con `file://`— `app.js` deja en su sitio la fórmula de reserva en HTML/CSS
que ya está en el marcado: **nada más en la aplicación depende de KaTeX**, y la medición sigue
funcionando igual. No hay `npm install` ni paso de compilación.

Los scripts son **clásicos, no módulos ES**. Es una decisión deliberada de robustez: los
módulos ES fallan con `file://` por CORS, mientras que así la aplicación se puede abrir
también desde disco (con el micrófono deshabilitado, pero sin errores de carga).

---

## 3. Arquitectura

### Cadena de audio

```
   REPRODUCCIÓN                              GRABACIÓN
   ────────────                              ─────────
   Float32Array (chirp)                      MediaStream (micrófono)
        │                                         │
   AudioBuffer                            MediaStreamAudioSourceNode
        │                                         │
   AudioBufferSourceNode                  AudioWorkletNode "rira-recorder"
        │                                  (o ScriptProcessorNode)
   GainNode (1.0)                                 │
        │                              ┌──────────┴──────────┐
        │                        chunks Float32        GainNode (0.0)
        └────────► destination ◄──────────────────────────┘
                 (altavoz activo)                 (ruta muda, solo para
                                                    que el grafo se procese)
```

Un único `AudioContext` y un único `MediaStream` para toda la página. El stream se abre en
la prueba de micrófono y **se reutiliza** en la medición: reabrirlo forzaría una nueva
negociación de ruta de audio (y en iOS, un cambio de sesión de audio a mitad de proceso).

### Por qué no `MediaRecorder`

`MediaRecorder` produce **Opus/WebM en Android** y **AAC/MP4 en iOS**: ambos con pérdidas y
ambos inservibles para análisis espectral. En su lugar capturamos muestras **Float32 crudas**
del grafo Web Audio y construimos el WAV nosotros (`js/wav.js`), byte a byte:

- `16` → `WAVE_FORMAT_PCM` (código 1), enteros con signo 16 bits little-endian — por defecto.
- `32` → `WAVE_FORMAT_IEEE_FLOAT` (código 3), float32 little-endian — sin recorte, útil
  cuando el margen de nivel es incierto.

Ambos los leen directamente MATLAB (`audioread`), Python (`scipy.io.wavfile`, `soundfile`),
Octave, Audacity y REW.

### Captura: AudioWorklet con reserva

`AudioWorkletNode` es lo primero que se intenta; el procesador se carga desde una **Blob URL**
para no necesitar un archivo `.js` adicional accesible por HTTP. Si falla (Safari antiguo,
CSP restrictiva), se cae automáticamente a `ScriptProcessorNode`. **Ambas rutas están
probadas** y el backend efectivamente usado se anota en el JSON (`recording.captureBackend`).

### Constraints del micrófono

Todo el procesamiento del navegador se desactiva, porque es no lineal y variante en el tiempo:

```js
{ echoCancellation: false, noiseSuppression: false, autoGainControl: false,
  voiceIsolation: false, channelCount: 1 }
```

Si el navegador rechaza las constraints, hay una cadena de reintentos degradantes
(`exact` → `ideal` → sin `deviceId` → `{audio:true}`) para que el usuario nunca se quede sin
micrófono. Los valores realmente concedidos se leen con `track.getSettings()` y se escriben
en el JSON, así que siempre se sabe si el sistema ignoró la petición.

### Sin corrección de latencia ni de fase

**No se intenta ninguna compensación.** El retardo de la cadena Bluetooth (codificación SBC/AAC/aptX,
búferes del altavoz, latencia de entrada del micrófono) es desconocido, variable entre dispositivos
e incluso a lo largo de una misma sesión. Lo que sí se hace:

- Se graba un **preludio de 0,3 s** antes de lanzar la reproducción y una **cola de 0,25 s** después
  de que termine la señal, para que el barrido quede con seguridad dentro del archivo.
- Se anota en el JSON el desfase **nominal** (`timing.nominal*`) junto con un aviso explícito de
  que no está compensado.
- Se ofrece la **señal de referencia** como WAV con exactamente la misma línea temporal y la misma
  frecuencia de muestreo, de modo que el alineamiento real se pueda obtener después por
  correlación cruzada.

### Temas claro y oscuro

La paleta activa la elige una clase en `<html>` (`theme-light` / `theme-dark`), y cada tema
redefine el mismo juego de variables CSS. La clase la fija un **script en línea en el `<head>`,
antes de que la hoja de estilos pinte**: primero la elección guardada en `localStorage`, si no
la preferencia del sistema (`prefers-color-scheme`). Por eso la página nunca parpadea con el
tema equivocado al cargar. Cada tema declara además `color-scheme`, lo que alinea los controles
nativos (barras de desplazamiento, anillos de foco) con la paleta.

El botón de la cabecera muestra el **icono de la acción**, no del estado: luna cuando se puede
pasar a oscuro, sol cuando se puede volver a claro. Las píldoras de idioma y el botón de icono
reproducen el patrón visual de
[timeseries-explorer](https://ferrucci-franco.github.io/timeseries-explorer/).

### Máquina de estados y mensajes

`idle → (prueba de micrófono) → preparación → grabación+reproducción → finalización → terminado`

La barra de estado inferior es permanente, con `role="status"` y `aria-live="polite"`, y punto
de color: gris (reposo), ámbar parpadeante (preparando), rojo parpadeante (grabando), verde
(terminado), rojo fijo (error). Durante la medición se pide `navigator.wakeLock` para que la
pantalla no se apague y se instala un `beforeunload` para evitar cerrar la página por accidente.

---

## 4. La señal

Barrido exponencial (Farina), la excitación estándar en medida de salas: reparte la misma
energía por octava y, tras la deconvolución, empuja la distorsión armónica **antes** de la
respuesta lineal, donde se puede recortar.

```
L      = T / ln(f2/f1)
K      = 2·π·f1·L
φ(t)   = K · (e^(t/L) − 1)
x(t)   = A · w(t) · sin(φ(t))
```

- Frecuencia instantánea: `f(t) = f1 · (f2/f1)^(t/T)`, exactamente `f2` en `t = T`.
- `w(t)`: ventana coseno alzado de 20 ms a la entrada y a la salida, para eliminar el clic.
  20 ms es menos de un periodo a 20 Hz, así que no altera el extremo grave de forma apreciable.
- `A`: **amplitud digital** ajustable (0–1), por defecto **0,5 (−6 dBFS)** para dejar margen.
  La app **nunca toca el volumen físico**; solo indica al usuario que lo ajuste a mano.

Se genera **a la frecuencia de muestreo real del `AudioContext`**, así que no hay remuestreo
en la reproducción.

### Parámetros (sliders)

Todo se ajusta con **sliders**, no con campos numéricos: en móvil se manejan con el pulgar y
no abren teclado, y el valor no puede quedar en un estado inválido a medio teclear. Cada uno
muestra su valor en vivo a la derecha de la etiqueta.

| Parámetro | Escala | Rango | Por defecto |
|---|---|---|---|
| Frecuencia inicial | **logarítmica** | 10 Hz – 2 kHz | 20 Hz |
| Frecuencia final | **logarítmica** | 100 Hz – 20 kHz | 2 kHz |
| Duración del barrido | lineal, paso 1 s | 1 – 120 s | 30 s |
| Amplitud digital | lineal, paso 0,05 | 0,05 – 1,00 | 0,50 (−6,0 dBFS) |
| Silencio inicial | lineal, paso 0,5 s | 0 – 5 s | **0 s** |
| Silencio final | lineal, paso 0,5 s | 0 – 5 s | **0 s** |

Detalles de implementación:

- Las **frecuencias usan escala logarítmica**: la posición del slider es un índice abstracto
  0–1000 que `app.js` mapea sobre el rango (tabla `SPEC`). Un slider lineal en Hz gastaría el
  90 % de su recorrido por encima de 2 kHz, inútil para medida de salas. El valor resultante
  se redondea a 1 / 5 / 10 Hz según la década para que sea legible.
- Los dos sliders de frecuencia están **acoplados**: si `f1` alcanza a `f2`, se empuja el otro.
  Así la interfaz nunca puede producir `f2 ≤ f1`. La validación de `chirp.js` sigue ahí como
  red de seguridad, y sí puede saltar el límite de Nyquist si el dispositivo impone una
  frecuencia de muestreo baja.
- La amplitud muestra también su equivalente en **dBFS**, que es lo que interesa en el curso.
- Se persisten en `localStorage` al soltar el slider (evento `change`), no durante el arrastre.
- Los **silencios valen 0 por defecto**: el motor ya graba un preludio de 0,3 s y una cola de
  0,25 s por su cuenta, así que el relleno adicional solo alargaba el archivo. Sigue disponible
  hasta 5 s por lado para quien quiera más margen. Cuando ambos valen cero, el texto de ayuda
  omite el desglose de silencios y dice simplemente « Balayage 20 → 2000 Hz, durée 30 s ».

### Rueda del ratón y trackpad

Todos los sliders —los del barrido y los de la sala— aceptan la **rueda del ratón o el
trackpad**, pero solo **después de que el puntero lleve 300 ms quieto encima**. Ese retardo es
lo que evita que desplazar la página mueva de paso todos los sliders por los que pasa el cursor.
Mientras está armado, el slider muestra un anillo de color y **consume** el evento
(`preventDefault`), así que la página no se desplaza; al salir el puntero, se desarma solo.

- Una muesca de rueda = un paso del slider. En trackpad los deltas de pocos píxeles se
  **acumulan** hasta completar un paso (`WHEEL_PX_PER_STEP = 100`), así que el gesto es suave y
  no salta.
- Se distingue `deltaMode`: píxeles se acumulan; líneas o páginas dan un paso por evento.
- El valor se **re-encaja en la rejilla del step** tras cada cambio, porque los pasos de 0,1 y
  0,05 acumulan deriva binaria si se suman en coma flotante.
- `pointerdown` desarma: si el usuario empieza a arrastrar, manda el arrastre.
- En táctil no se arma nunca (se filtra `pointerType === 'touch'`), porque ahí no hay hover.
- `change` —y por tanto la escritura en `localStorage`— va con un retardo de 250 ms, para no
  escribir en cada muesca.

La validación rechaza `f2 ≤ f1`, `f2 > 0,95 · Nyquist` y valores fuera de rango, con mensaje
traducido.

---

## 5. Modos propios de la sala

La tarjeta « Modes propres de la pièce » predice **dónde van a caer las resonancias** antes
incluso de medir, para que el estudiante sepa qué buscar en el espectro. Tres sliders (largo,
ancho, alto) y el cálculo se rehace en cada movimiento.

### El modelo

Modelo de Rayleigh para un paralelepípedo de **paredes perfectamente rígidas**:

```
             c        ⎡ (nx/L)² + (ny/W)² + (nz/H)² ⎤
f(nx,ny,nz) = ─── · √ ⎣                             ⎦
             2

c  = 343 m/s (velocidad del sonido a 20 °C)
nx, ny, nz  enteros ≥ 0, no todos nulos
```

Tres familias, de energía decreciente, porque cada una rebota en un número distinto de superficies:

| Familia | Índices no nulos | Superficies | Energía |
|---|---|---|---|
| **Axial** | 1 | 2 | la más alta |
| **Tangencial** | 2 | 4 | ~3 dB por debajo |
| **Oblicuo** | 3 | 6 | la más baja |

Las **fundamentales axiales** son el caso particular más útil, y se muestran en tres tarjetas:
`f = c/(2L)`, `c/(2W)`, `c/(2H)`. Para una sala de 5 × 4 × 2,7 m son 34,3 / 42,9 / 63,5 Hz.

### Implementación

`js/modes.js` es un **módulo puro** (sin DOM, sin dependencias, testeable en Node) que enumera
los modos hasta un orden máximo, los clasifica por número de índices no nulos, los ordena por
frecuencia y devuelve los más bajos. `app.js` solo lo presenta.

- La **banda de reparto** usa escala logarítmica fija de 8 a 500 Hz. Es deliberadamente **no
  adaptativa**: al no moverse el eje, se ve de un vistazo que agrandar la sala desplaza todo
  hacia la izquierda. Los límites cubren todos los ajustes posibles de los sliders (8,6 Hz para
  una sala de 20 m por un lado; ~350 Hz para el modo 12 de la sala más pequeña por el otro).
- Se dibujan y se tabulan **los mismos 12 modos más bajos**, para que la banda y la tabla nunca
  se contradigan. Por encima de esos 12, la densidad modal crece como `f³` y la representación
  individual deja de tener sentido.
- La sugerencia final enlaza con la medición: indica la frecuencia propia más baja y recomienda
  empezar el barrido por debajo, que es justo el ajuste « Fréquence initiale » del panel siguiente.
- La fórmula se tipografía con **KaTeX**. Los tres sliders de dimensión se reparten en una sola
  línea cuando caben, con `repeat(auto-fit, minmax(12rem, 1fr))`: pasan a dos columnas y luego a
  una según se estrecha la pantalla, y el mínimo de 12 rem está calculado sobre la etiqueta más
  ancha (« Longueur (profondeur) », 137 px) para que **ninguna etiqueta llegue nunca a partirse**.

### Limitación del modelo

Es un modelo **idealizado**: paredes perfectamente rígidas y sala rectangular vacía. Una sala
real (muebles, absorbentes, tabiques ligeros) desplaza las resonancias y sobre todo **las
ensancha**, porque las paredes reales absorben y el factor de calidad cae. Sirve como guía de
lectura del espectro medido, no como verdad. La tarjeta lo dice explícitamente en los tres idiomas.

---

## 6. Vista previa de la respuesta en amplitud

Al terminar el barrido, bajo el resumen aparece una **curva de amplitud en función de la
frecuencia**, para ver de un vistazo si se captaron resonancias. Es lo primero que se ve antes
de descargar nada.

### Qué se calcula, y por qué así

No hay deconvolución. Se comparan dos **densidades espectrales de potencia** estimadas por el
método de Welch:

```
|H(f)|² ≈ Pyy(f) / Pxx(f)
```

con `y` = grabación del micrófono y `x` = señal de referencia realmente reproducida. De ahí
salen dos propiedades que son justo las que hacen falta aquí:

1. El **cociente elimina la coloración del propio barrido** (un barrido exponencial deposita
   energía en 1/f), así que lo que queda es la respuesta del sistema medido.
2. El módulo es **insensible al retardo**: un desplazamiento temporal solo afecta a la fase.
   La latencia desconocida —que la aplicación nunca intenta corregir— por tanto **no falsea
   esta curva**. Es la razón de elegir este método y no una deconvolución.

Después se suaviza a **1/6 de octava** promediando en el dominio de potencia, se muestrea sobre
una rejilla logarítmica de 300 puntos y se normaliza por la **mediana**: solo la forma tiene
sentido, no el nivel absoluto, que depende del volumen y del micrófono.

### La ventana: seno, no Hann

Welch pondera cada muestra por el **cuadrado** de la ventana, así que es ese cuadrado el que
debe sumar constante sobre la rejilla de saltos (COLA). Si no, la energía medida depende de
dónde caiga la rejilla — y un barrido cruza su octava más alta en una fracción de ventana, de
modo que arriba esa dependencia es brutal: **con ventana de Hann al 50 % de solapamiento,
retrasar la grabación 200 ms movía la parte alta de la curva 30 dB**. Se detectó con el test de
invariancia al retardo, no a ojo.

La ventana **seno** eleva al cuadrado a una Hann, y Hann sí es COLA sobre media ventana, así
que el 50 % ya es exacto: **la mitad de FFT** que necesitaría una Hann (que exigiría el 75 %)
para el mismo resultado. Por eso el número de segmentos **no** se limita: limitarlo significa
estirar el salto, que es precisamente lo que rompe la propiedad.

Además la rejilla de segmentos **empieza antes de la primera muestra y acaba después de la
última**, tratando el exterior como silencio. COLA solo se cumple donde una muestra la ven
todas las fases de la ventana; sin esa extensión, las primeras y últimas `fftSize` muestras
quedan infra-contadas — y un barrido pone sus frecuencias más altas justo al final del array,
exactamente en ese punto ciego.

### Presentación

SVG en línea, sin librería de gráficos: hereda los colores del tema y se mantiene nítido. Se
genera **al tamaño en píxeles del contenedor**, no con un `viewBox` escalado, que es lo que
mantiene las etiquetas a su tamaño real (un `viewBox` estirado deformaría el texto, y uno
escalado uniformemente lo dejaría en pocos píxeles en un móvil). Se redibuja al cambiar el
ancho de la ventana o el idioma.

Los bordes de banda se **recortan** medio ancho de suavizado: donde la ventana de 1/6 de octava
se saldría de la zona excitada quedaría apoyada en uno o dos bins que el barrido apenas excitó,
lo que producía excursiones de decenas de dB. Esos puntos quedan como `NaN` y sencillamente no
se dibujan; el trazo se levanta en los huecos en vez de puentearlos.

El análisis corre en una tarea diferida (~0,4 s para 30 s de grabación en escritorio, ~1,5 s
para el máximo de 120 s), así que las descargas aparecen primero y el hueco muestra
«Analyse du signal…» en lugar de congelar la página.

### Lo que la curva NO es

Contiene el **altavoz, la sala Y el micrófono**, y el micrófono es el **del propio teléfono**,
sin calibrar y con su respuesta y su posición. La interfaz lo dice explícitamente en los tres
idiomas, e indica el nombre del micrófono cuando la plataforma lo facilita. Es un vistazo para
localizar resonancias, no una medida.

---

## 7. Modo palmada (respuesta al impulso)

La aplicación tiene **dos modos**, con un selector encima del botón de medir:

| | **Barrido** | **Palmada** |
|---|---|---|
| Excitación | la app reproduce un chirp | usted da una palmada |
| Reproducción | sí | **ninguna** |
| Referencia | sí, se descarga | no existe |
| Resultado | respuesta en amplitud | **decaimiento y RT60** |

Una palmada **es** una impulsión: lo que se graba ya es la respuesta al impulso, sin necesidad
de deconvolución. Es lo que se oye «vibrar» en la sala después de un aplauso.

### Lo que se puede y lo que no se puede sacar de una palmada

Esta distinción es estructural y la interfaz la dice explícitamente:

- **NO se puede sacar respuesta en frecuencia.** El espectro medido es el de la sala
  **multiplicado** por el de la palmada, y este último es desconocido y distinto en cada
  palmada. Sin referencia no hay forma de separarlos. Por eso el modo palmada no muestra la
  curva de amplitud de la sección 6.
- **Sí se puede sacar el decaimiento.** La pendiente a la que cae la energía es propiedad de la
  sala sola, mientras la fuente sea breve frente a esa caída. De ahí salen EDT, T20, T30 y RT60.

### Disparo automático

Nada se reproduce: se arma la grabación y se espera. El motor graba en continuo con un búfer
circular y **arranca la cuenta al detectar el transitorio**. El pre-registro sirve dos veces:
conserva el ataque real de la palmada, que es lo que lleva las frecuencias altas, y da a
`decay.js` un tramo de fondo con el que medir el nivel de ruido.

| Parámetro | Rango | Por defecto |
|---|---|---|
| Duración grabada | 1 – 15 s | 5 s |
| Umbral de disparo | −45 a −3 dBFS | −20 dBFS |
| Pregrabación | 0 – 500 ms | 50 ms |

Si no llega ninguna palmada en 60 s, se aborta con un mensaje que sugiere aplaudir más fuerte o
bajar el umbral. El vúmetro de la sección de micrófono sirve para elegir el umbral: se ve
directamente a cuántos dBFS pica la palmada.

### El cálculo: integración inversa de Schroeder

Leer el decaimiento sobre la señal cruda es inútil, porque es ruido. Schroeder (1965) integra
hacia atrás:

```
EDC(t) = 10 log10 ( ∫ desde t hasta T de h²(x) dx )
```

lo que da una curva lisa por construcción, sobre la que se ajusta una recta por mínimos
cuadrados:

| Estimador | Tramo ajustado | RT60 |
|---|---|---|
| EDT | 0 a −10 dB | 6 × pendiente |
| T20 | −5 a −25 dB | 3 × pendiente |
| T30 | −5 a −35 dB | 2 × pendiente |

Se muestran los tres, más el RT60 del mejor disponible y el margen útil, y el gráfico dibuja la
curva EDC con **la recta ajustada superpuesta** en trazo discontinuo, para que se vea de un
vistazo si el decaimiento era realmente recto.

### Dos detalles que cambian el resultado

**El truncado.** La integral de Schroeder sobre una cola que ya es puro ruido no decae: se
aplana, y una cola plana arrastra la pendiente hacia cero e infla el RT60. Se trunca la
integración donde la envolvente cae al ruido de fondo más un margen de 10 dB (la forma simple
de lo que el método iterativo de Lundeby refina). No es un detalle menor: medido sobre
decaimientos sintéticos, **sin truncar, un RT60 real de 0,6 s se lee como 17 s**.

**El margen útil.** Un ajuste solo es fiable si hay recorrido **más allá** del tramo ajustado:
el decaimiento tiene que mantenerse despegado del ruido durante todo el ajuste, no rozarlo al
final. Se exigen 10 dB de margen sobre el tramo, o sea 20 / 35 / 45 dB para EDT / T20 / T30. Un
ajuste que no llega se muestra igualmente pero **marcado en ámbar con un asterisco**, y el
`best` cae al siguiente estimador honesto. Medido: un T30 leído con 39 dB de margen ya se queda
un 11 % corto, mientras que el T20 en las mismas condiciones acierta al 4 %.

Hubo que corregir cómo se medía ese margen. Tomarlo del último valor de la curva EDC **no
funciona**: una integral hacia atrás siempre se desploma hacia −∞ en sus últimas muestras, haya
ruido o no, así que reportaba decenas de dB de margen inexistente y la advertencia no se
disparaba nunca. Se mide ahora como la relación entre la potencia en el ataque y la del ruido
de fondo.

### Metadatos

El JSON cambia de esquema (`acoustic-impulse-measurement/1`), lleva `mode: "clap"`,
`referenceFile: null`, el umbral y el pre-registro usados, y una nota que explica por qué de ese
archivo no sale una respuesta en frecuencia. El bloque de latencia se sustituye por otro que
dice que en modo impulso no hay nada que compensar, porque no se reproduce nada.

---

## 8. Archivos entregados

Los tres comparten un identificador de medición (`AAAAMMDD-HHMMSS` local):

| Archivo | Contenido |
|---|---|
| `mesure_<id>.wav` | La grabación del micrófono, mono, sin comprimir |
| `mesure_<id>.json` | Metadatos completos |
| `reference_<id>.wav` | La señal de excitación exacta, misma línea temporal y misma `fs` |

El JSON incluye: frecuencias, duraciones, silencios, amplitud, fórmula del barrido, ventanas de
fade, frecuencia de muestreo, canales, número de muestras, profundidad de bits, codificación,
tamaño, **pico y RMS en dBFS**, recuento de muestras saturadas, backend de captura, etiqueta e
identificador del micrófono, estado real de AEC/NS/AGC, `baseLatency`/`outputLatency`,
`userAgent`, plataforma, idioma y marcas de tiempo local y UTC.

Tras la medición la interfaz muestra un resumen y **avisa si hay saturación** o si el nivel
grabado es demasiado bajo (< −45 dBFS).

---

## 9. Limitaciones

### iOS / Safari (iPhone, iPad)

- **Gesto de usuario obligatorio.** El `AudioContext` se crea y se reanuda dentro del
  manejador del clic, de forma síncrona antes de cualquier `await`. Es la razón de que exista
  `Engine.unlock()`.
- **Ruta de salida al abrir el micrófono.** Históricamente iOS conmuta la salida al auricular
  con volumen reducido en cuanto se abre el micrófono. Se mitiga con
  `navigator.audioSession.type = 'play-and-record'` (Safari 17+); en versiones anteriores **no
  hay solución desde la web**. Si el sonido no sale por el altavoz Bluetooth: desconectar y
  reconectar el altavoz, o subir el volumen con los botones físicos con la página ya abierta.
- **Frecuencia de muestreo impuesta.** No se puede elegir; iOS suele dar 48 000 Hz. Se lee y se
  anota, nunca se fuerza.
- **Sin nombres de dispositivo útiles.** Safari devuelve etiquetas genéricas o vacías; el JSON
  refleja lo que haya (`microphoneLabel: null` si no hay nada).
- **Sin selección real de entrada.** iOS decide el micrófono; el selector puede no tener efecto.
- **La pantalla y el bloqueo.** `navigator.wakeLock` existe desde iOS 16.4; en versiones previas
  hay que evitar que la pantalla se apague manualmente. Si Safari pasa a segundo plano, el audio
  se suspende y la medición se corrompe: **no cambiar de aplicación durante la medida**.
- **AGC no siempre desactivable.** iOS puede ignorar `autoGainControl: false`. El JSON registra
  el valor efectivo; si aparece `true`, los niveles absolutos no son fiables.

### Android / Chrome

- **Perfil Bluetooth** (solo si se usa Bluetooth). Es el problema más serio. Si Android conmuta el altavoz a **HFP/SCO**
  (modo manos libres) al abrir el micrófono, todo el enlace cae a banda estrecha (8–16 kHz) y
  la medida no vale. Con **A2DP** la reproducción es de banda ancha. Mitigación práctica:
  seleccionar explícitamente el **micrófono integrado del teléfono** en el selector de
  dispositivo y comprobar en el JSON que `trackSampleRateHz` sigue siendo 44 100 o 48 000.
- **Latencia de salida alta y variable**, típicamente 100–300 ms por Bluetooth (con altavoz
  integrado o por cable baja a unos pocos ms, pero sigue sin estar medida). Irrelevante para
  análisis espectral de magnitud; **crítico** para cualquier medida temporal o de fase, que exige
  alineamiento previo por correlación cruzada.
- **Selección de dispositivo.** Las etiquetas solo aparecen tras conceder el permiso, por eso la
  lista se rellena después de la prueba de micrófono.
- **Ahorro de energía.** Con la pantalla apagada o la pestaña en segundo plano, Chrome limita los
  temporizadores y puede suspender el audio. Por eso se usa `wakeLock` y se avisa de no salir.

### Comunes a todas las plataformas

- **El micrófono del teléfono no está calibrado.** Respuesta desconocida, típicamente con corte
  bajo agresivo por debajo de 100–200 Hz. El defecto de 20 Hz es didáctico; en la práctica un
  móvil no capta nada útil por debajo de ~50 Hz. Es una medida **relativa**, no absoluta ni en
  dB SPL.
- **AGC del sistema operativo.** Fuera del navegador, puede haber compresión que la web no ve.
- **Saturación.** Si el nivel es demasiado alto, satura el micrófono, no el altavoz. Se detecta y
  se avisa; entonces hay que bajar el volumen y repetir.
- **Grabación mono.** Se guarda el canal 0. Suficiente para el objetivo del curso.
- **Memoria.** Todo se mantiene en RAM: 30 s a 48 kHz en 16 bits ≈ 2,9 MB, sin problema. Con
  duraciones muy largas y float32 conviene vigilarlo en móviles antiguos.
- **Nada se envía a ningún servidor.** Todo el procesamiento es local.

---

## 10. Qué hacer después con los archivos (fuera de esta versión)

La vista previa de la sección 6 da una **magnitud suavizada**, suficiente para localizar
resonancias pero no para un análisis serio: no hay deconvolución, ni respuesta al impulso, ni
fase. Para el post-procesado de verdad, con `mesure_*.wav` y `reference_*.wav` a la misma `fs`:

1. Alinear por **correlación cruzada** (obligatorio: la latencia Bluetooth no está compensada).
2. Deconvolucionar con el filtro inverso del barrido exponencial para obtener la respuesta al
   impulso, o simplemente comparar espectros si solo interesa la magnitud.
3. Recortar la distorsión armónica, que aparece **antes** del pico lineal.

---

## 11. Añadir un idioma

En `js/i18n.js`, copiar el bloque `en`, traducir los valores, registrarlo bajo su código ISO
639-1 y añadir una píldora `<button class="lang-btn" data-lang="XX">XX</button>` en `index.html`. Las claves que falten caen automáticamente al
francés. El idioma se detecta del navegador y se recuerda en `localStorage`; el cambio es
instantáneo, incluidos los textos dinámicos (estado, resumen, cuenta atrás).

---

## 12. Verificación realizada

Los dos hashes SRI de KaTeX del `index.html` se calcularon descargando los archivos reales del
CDN (`openssl dgst -sha384`), no de memoria.

**Pruebas numéricas** (182/182 correctas, `chirp.js` + `wav.js` + `modes.js` + `spectrum.js` + `decay.js` en Node):
frecuencia instantánea medida por cruces por cero frente a la teórica en varios instantes
(error < 0,3 %), amplitud de pico exacta, silencios exactamente nulos, ausencia de saltos que
produzcan clics, validación de parámetros, cabecera RIFF completa campo a campo en 16 y 32 bits,
ida y vuelta de muestras, intercalado estéreo, concatenación de bloques y medidas de nivel.
Para `modes.js` (30 pruebas): fundamentales axiales iguales a `c/(2·dim)`, volumen, modo más bajo
fijado por la dimensión mayor, sala cúbica con su triplete degenerado y su primer tangencial en
`(c/2)·√2/3`, clasificación axial/tangencial/oblicuo por número de índices no nulos, orden
ascendente de la lista, coincidencia con un cálculo a mano de `f(2,1,3)`, escalado lineal con `c`,
`speedOfSound(0) = 331,3 m/s`, y excepción ante dimensiones nulas, negativas, `NaN` o infinitas.
Para `spectrum.js` (45 pruebas): la FFT contrastada contra una DFT ingenua (error < 1e-9),
señal continua concentrada en el bin 0, coseno en el bin 7 con la magnitud teórica `N/2`,
identidad de Parseval, simetría de las ventanas, y `sen² ` plano al 50 % de solapamiento frente
al rizado de `Hann²` en esa misma rejilla. Sobre `analyse`: entrada igual a la salida da curva
plana (< 0,5 dB), una ganancia pura no inclina la curva, **un retardo de 200 ms deja la curva
plana y coincidente punto a punto con la no retardada dentro de 1,5 dB en los 292 puntos**, un
paso bajo de un polo cae ~20 dB por década, un resonador agudo aparece como pico a menos del
10 % de su frecuencia y más de 15 dB sobre la mediana, dos resonancias separadas se resuelven
ambas, los bordes se recortan un doceavo de octava, y devuelve `null` ante entradas ausentes,
frecuencia de muestreo nula, señal demasiado corta o `f2 ≤ f1`.
Para `decay.js` (58 pruebas): decaimientos sintéticos de RT60 conocido (0,4 / 0,8 / 1,6 s)
recuperados al 6 % por T20 y T30 y al 12 % por EDT, con r² > 0,99; los tres estimadores
coincidiendo al 8 % sobre una exponencial pura; detección del ataque tras 250 ms de silencio
sin sesgar el RT60; **el truncado verificado en tres niveles de ruido, comprobando tanto que
con él el resultado se mantiene a menos del 15 % como que sin él se dispara más de 5 veces**;
los umbrales de validez comprobados en el caso de 39 dB de margen (T30 marcado corto, T20
aceptado y acertando al 10 %, `best` cayendo a T20); la curva EDC monótona decreciente y
arrancando en 0 dB; la aritmética de `fitRange` contra una recta exacta de −20 dB/s
(pendiente, RT60, r² y extremos del tramo); y `null` ante entrada vacía, todo ceros, frecuencia
de muestreo nula o nada que ajustar.

**Pruebas en navegador** (Chrome, viewport de 375 px, con micrófono sintético inyectado):
sliders en sus valores por defecto y en ambos extremos, mapeo logarítmico de frecuencias
(10 → 38 → 140 → 530 → 2000 Hz a lo largo del recorrido), acoplamiento `f1`/`f2` en el caso
límite (`f1` al máximo con `f2` al mínimo → `f2` empujado a 2,4 kHz, parámetros válidos),
equivalencia amplitud/dBFS, botón de restablecer, persistencia en `localStorage` al soltar el
slider, y ausencia de desbordamiento horizontal con una columna en móvil;
tarjeta de modos propios contrastada contra `modes.js` en los tres casos extremos de los sliders
(sala de 20 × 20 × 8 m, de 1 × 1 × 1,8 m y la de por defecto), con los 12 modos siempre dibujados
dentro de la banda (posiciones entre 1,7 % y 88,3 %) y etiquetas de eje sin recorte en los bordes;
bascula de tema en ambos sentidos con `localStorage`, `color-scheme` y icono coherentes, y sin
parpadeo al recargar; píldoras de idioma con estado `active`/`aria-pressed` correcto;
fórmula tipografiada por KaTeX y con el color del tema en claro y en oscuro, cabiendo sin
desplazamiento lateral a 375 px; los tres sliders de dimensión en una sola línea a partir de
704 px de ancho de contenedor, en dos y luego en una por debajo, sin que ninguna etiqueta se
parta en ningún ancho probado (320 a 900 px); rueda del ratón ignorada antes de los 300 ms y
activa después, una muesca por paso, acumulación de deltas pequeños de trackpad (10 × 12 px =
un paso), `preventDefault` confirmado, recorte correcto en ambos extremos, desarme al salir el
puntero y ausencia de armado en `pointerType: 'touch'`;
vista previa espectral con un micrófono sintético pasado por un resonador de 150 Hz conocido:
el pico realmente dibujado en el SVG cae en **150,4 Hz** (0,3 % de error) a +22,7 dB sobre la
mediana, los 292 puntos del trazo caen dentro del marco, los rótulos de eje salen correctos
(20/50/100/200/500/1k/2k) y el análisis tardó 184 ms; redibujado a 375 px dando un SVG de
308 × 190 px con etiquetas de 11 px reales y sin desbordamiento; colores del trazo, la rejilla
y los rótulos siguiendo el tema en claro y en oscuro;
modo palmada con un impulso sintético inyectado como micrófono, de RT60 conocido: armado
correcto (« Prêt — claquez des mains une fois » con el punto rojo y « En attente du
claquement… »), disparo automático al transitorio, y **RT60 leído de 0,90 s para un 0,9 s real
y de 0,70 s para un 0,7 s real**, con EDT/T20/T30 coherentes y r² = 1; descarga de referencia
correctamente ausente, tarjeta de espectro oculta y tarjeta de decaimiento mostrada; metadatos
con esquema `acoustic-impulse-measurement/1`, `referenceFile: null` y el bloque de latencia
sustituido; recta de ajuste dibujada y **cero atributos SVG con `NaN` sobre 23 elementos**;
redibujado a 375 px dando 308 × 190 px con etiquetas de 11 px reales; conmutación de modo
intercambiando parámetros, ayuda y rótulo del botón, y persistiendo en `localStorage`;
regresión del modo barrido tras todos estos cambios (pico −12,04 dBFS, 292 puntos de curva,
referencia presente, esquema de barrido intacto);
medición completa de extremo a extremo, secuencia de estados
`Préparation → Enregistrement → Finalisation → Terminé`, WAV resultante con cabecera válida y
tono de 440 Hz recuperado con pico de −12,04 dBFS (exactamente la amplitud inyectada), JSON de
metadatos completo, duración = preludio + señal + cola, cancelación a mitad de medida con
restauración correcta de la interfaz, ruta de reserva `ScriptProcessorNode` forzada, salida
float32 con código de formato 3, y conmutación de idioma fr/en/es incluyendo textos dinámicos.

No se ha podido probar en hardware real de iPhone/Android ni con un altavoz Bluetooth físico;
las limitaciones de la sección 7 están documentadas a partir del comportamiento conocido de esas
plataformas, no de una medida propia. La comprobación visual en móvil se hizo con el viewport
emulado a 375 × 812 px en Chrome, en tema claro y oscuro, no en un iPhone físico.
