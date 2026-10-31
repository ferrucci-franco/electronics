# Simulador de circuitos en continua (DC)

Aplicación HTML/CSS/JavaScript autónoma: se abre `index.html` (doble clic o desde GitHub Pages), sin instalación ni servidor. Interfaz en inglés, francés y español; tema claro/oscuro; modo escritorio y modo móvil (botón 📱/🖥 del encabezado; la elección queda guardada).

Copia pública: https://ferrucci-franco.github.io/electronics/dc-circuit-simulator/

## Componentes

| Componente | Modelo |
|---|---|
| Resistencia | lineal |
| Fuente de tensión / de corriente | ideales, continuas |
| Amperímetro / voltímetro | ideales (0 V / circuito abierto) |
| Diodo y diodo Schottky | ideal (0 V al conducir), caída constante Vγ con r_d opcional, o exacto (Shockley, I = I_S(e^{V/nV_T} − 1)) |
| Amplificador operacional | ideal (ganancia infinita, sin corriente de entrada, R_out = 0), saturación opcional en ±Vsat |
| Transistor bipolar NPN / PNP | simple: corte, activa (V_BE = 0,7 V, I_C = βI_B) o saturación (V_CE = V_CE,sat) |
| Masa | nodo de referencia |

Símbolos USA (por defecto) o IEC/europeos.

## Resultados

- Se resuelve después de cada cambio. Sobre el circuito: V (con signos + y − en la polaridad real), I (la flecha indica el sentido real), P (positiva = absorbida, negativa en verde = entregada), tensiones de nodo y animación del sentido de la corriente.
- Pestaña **Resultados**: tabla de todos los elementos, balance de potencia y tensiones de nodo.
- Pestaña **Thévenin / Norton**: equivalente visto por un elemento (la carga se retira) o entre dos nodos A y B elegidos en el circuito. V_Th es la tensión a circuito abierto, I_N la corriente de cortocircuito, R_Th la pendiente de v_AB al inyectar una corriente de prueba (las fuentes dependientes —AO, transistor— siguen activas, por eso R_Th puede salir negativa). Si el circuito tiene elementos no lineales, el equivalente se linealiza alrededor del punto a circuito abierto. Con una resistencia de carga se muestran I, V, P y la máxima transferencia de potencia.

## Uso

- Ratón: clic en un componente de la lista y clic en la grilla (o arrastrar desde la lista); arrastrar desde un terminal dibuja un cable; rueda = zoom; botón derecho o del medio = desplazar; arrastrar sobre el fondo = selección por rectángulo; doble clic = propiedades.
- Táctil: tocar el componente y luego la grilla; un dedo sobre el fondo desplaza, dos dedos hacen zoom; toque largo sobre el fondo = selección por rectángulo, sobre un elemento = propiedades.
- Teclado: R (rotar), F (espejar), W (cable), Supr, Ctrl+Z / Ctrl+Y, Ctrl+C / Ctrl+V, Ctrl+D, Ctrl+A, flechas, Esc.
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
