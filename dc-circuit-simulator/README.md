# Simulador de circuitos en continua (DC)

Aplicación HTML/CSS/JavaScript autónoma: se abre `index.html` (doble clic o desde GitHub Pages), sin instalación ni servidor. Interfaz en inglés, francés y español; tema claro/oscuro; modo escritorio y modo móvil (botón 📱/🖥 del encabezado; la elección queda guardada).

Copia pública: https://ferrucci-franco.github.io/electronics/dc-circuit-simulator/

## Componentes

| Componente | Modelo |
|---|---|
| Resistencia | lineal |
| Potenciómetro | dos resistencias A–cursor y cursor–B según la posición α, curva lineal o logarítmica (audio); la flecha del cursor se arrastra sobre el circuito (o deslizador del panel, teclas [ y ]) y el circuito se resuelve en vivo; control opcional tipo perilla (rotativo, 270°) que se gira arrastrando |
| Fuente de tensión / de corriente | ideales, continuas |
| Amperímetro / voltímetro | ideales (0 V / circuito abierto) |
| Diodo y diodo Schottky | ideal (0 V al conducir), caída constante Vγ con r_d opcional, o exacto (Shockley, I = I_S(e^{V/nV_T} − 1)) |
| LED (rojo, naranja, amarillo, verde, azul, blanco) | caída constante Vγ típica del color (con r_d) o exacto (exponencial, n = 2, Vγ a 10 mA); se ilumina según I/I_max y avisa si I > I_max |
| LED RGB | cátodo común o ánodo común, Vγ por canal; el brillo mezcla los tres colores según la corriente de cada canal |
| Amplificador operacional | ideal (ganancia infinita, sin corriente de entrada, R_out = 0), saturación opcional en ±Vsat |
| Transistor bipolar NPN / PNP | simple (ideal): corte, activa (V_BE = 0,7 V, I_C = βI_B) o saturación (V_CE = V_CE,sat); o real: Ebers-Moll con efecto Early (I_S, β_F, β_R, V_A), junturas exponenciales y saturación suave |
| Masa | nodo de referencia |

Símbolos USA (por defecto) o IEC/europeos.

## Resultados

- **Sentidos de referencia elegidos por el usuario.** Cada elemento de dos terminales muestra el + y − de su tensión y la flecha de su corriente; se invierten tocándolos (o con los botones ⇅ V / ⇄ I del panel). Los valores llevan signo según esas referencias, como en un ejercicio resuelto a mano. Por defecto: convención pasiva, salvo las fuentes (convención generador). En Ajustes se puede pasar a "sentido real" (magnitudes con la polaridad y el sentido reales).
- **Tensiones de nodo respecto de masa** (las incógnitas del método de nodos): botón Nodos sobre el circuito y tabla en la pestaña Resultados. Un nodo se nombra (A, B, sal…) seleccionando uno de sus cables.
- **Verificación de Kirchhoff** en la pestaña Resultados: LKC en cada nodo (suma de corrientes salientes según las flechas de referencia) y LKT en cada lazo independiente (lazos fundamentales de un árbol generador), con los valores sustituidos y ✓.
- Corriente en los cables: al seleccionar un cable (o en todos, opción de Ajustes) se ve la corriente de cada rama de cable con su flecha; donde los cables forman un árbol el valor es exacto por la LKC, y en un lazo de cables ideales (o entre varias masas) se marca como indeterminada.
- Tabla de todos los elementos, balance de potencia (P > 0 absorbida, P < 0 entregada) y animación del sentido de la corriente (velocidad proporcional a la corriente, o logarítmica en Ajustes).
- **Característica I–V** del elemento seleccionado con el punto de operación Q y la recta de carga (Thévenin del resto). Con varios elementos en serie o en paralelo se superponen sus curvas y la combinada; para el transistor, la característica de entrada I_B(V_BE) (modelo simple y exponencial de referencia) y las de salida I_C(V_CE) con zonas de corte y saturación, ambas con su recta de carga calculada sobre el circuito real (pasa exactamente por Q); para el AO, la transferencia.
- Pestaña **Thévenin / Norton**: equivalente visto por un elemento (la carga se retira) o entre dos nodos A y B elegidos en el circuito. V_Th es la tensión a circuito abierto, I_N la corriente de cortocircuito, R_Th la pendiente de v_AB al inyectar una corriente de prueba (las fuentes dependientes —AO, transistor— siguen activas, por eso R_Th puede salir negativa). Si el circuito tiene elementos no lineales, el equivalente se linealiza alrededor del punto a circuito abierto. Con una resistencia de carga se muestran I, V, P y la máxima transferencia de potencia.

## Uso

- Colocar: tocar o hacer clic en un componente de la lista y luego en la grilla, o arrastrarlo desde la lista. Arrastrar desde un terminal dibuja un cable (el ruteo esquiva los componentes). Doble clic / doble toque = propiedades.
- Mover: los cables conectados siguen al componente (rubber band) y se rutean en tramos horizontales y verticales durante el arrastre; si un terminal tocaba otro terminal o un cable sin cable propio, se crea el cable que mantiene la conexión; al soltar se unen tramos colineales y se recortan las puntas que quedaron sueltas; se desactiva con 🔗 (barra sobre el circuito) o en Ajustes para mover sin cables (desconectar). Alt + arrastrar invierte el modo en ese movimiento.
- Rotar y espejar: clic derecho sobre un componente (Mayús + clic derecho = espejo), teclas R / F, o los botones ⟳ / ⇋ de la barra sobre el circuito (también mientras se coloca, para el uso con el dedo).
- Zoom y desplazamiento: rueda (o pellizco en el touchpad) = zoom alrededor del puntero; arrastrar con el botón derecho o del medio, o Espacio + arrastrar = desplazar; con el dedo, un dedo sobre el fondo desplaza y dos dedos hacen zoom; botones + / − / ⤢ y teclas +, −, 0. Arrastrar sobre el fondo con el ratón (o toque largo y arrastrar con el dedo) = selección por rectángulo.
- Teclado: Supr, Ctrl+Z / Ctrl+Y, Ctrl+C / Ctrl+V, Ctrl+D, Ctrl+A, flechas, W (cable), Enter (propiedades), Esc.
- Botón **Ordenar**: une tramos de cable colineales, quita duplicados y puntas sueltas, y convierte cables en diagonal en tramos en L que rodean los componentes; solo se aplica si todas las conexiones quedan iguales (se deshace con Ctrl+Z).
- Las etiquetas (nombre, valor y resultados) se ubican solas del lado que no tapa símbolos, cables ni otras etiquetas.
- Los valores aceptan prefijos: 4k7, 2.2M, 10m, 100u, 1n… (M = mega, m = mili).
- Archivo: guardar / abrir JSON, copiar un enlace que contiene el circuito, exportar PNG. El circuito actual se guarda en el navegador.

## Cálculo

`js/solver.js` arma el análisis nodal modificado (MNA). Los elementos lineales por tramos (diodos ideal y Vγ, AO con saturación, transistor) tienen estados discretos: el programa busca un conjunto de estados cuya solución lineal sea coherente con todos ellos (primero cambiando todos los incoherentes, luego de a uno, y por último búsqueda exhaustiva empezando por los estados más cercanos a la solución anterior). Los diodos exactos se resuelven por Newton-Raphson con limitación de la tensión de juntura y, si hace falta, rampa de fuentes. Un AO con realimentación positiva (disparador de Schmitt) no se deja en la solución lineal inestable: queda saturado y recuerda su estado anterior (histéresis). Se detectan lazos de fuentes de tensión, fuentes de corriente sin camino, fuentes en cortocircuito y nodos flotantes.

Verificaciones numéricas (contra cálculos a mano):

    node tests/solver.test.js
    node tests/netlist.test.js

## Archivos

- `index.html`, `css/style.css`
- `js/solver.js` (MNA, estados, Newton, Thévenin/Norton), `js/netlist.js` (del dibujo a los nodos), `js/components.js` (geometría y símbolos), `js/render.js` (dibujo en canvas y ubicación de etiquetas), `js/editor.js` (ratón, táctil, teclado), `js/ui.js` (paneles), `js/app.js` (estado, historial, guardado), `js/i18n.js`, `js/units.js`, `js/examples.js`
