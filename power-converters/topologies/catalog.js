(() => {
  "use strict";

  window.converterTopologies = Object.freeze([
    Object.freeze({
      id: "buck",
      status: "available",
      name: Object.freeze({
        en: "Buck converter",
        fr: "Convertisseur buck",
        es: "Convertidor buck",
      }),
      description: Object.freeze({
        en: "Step-down converter with an LC output filter.",
        fr: "Convertisseur abaisseur avec filtre de sortie LC.",
        es: "Convertidor reductor con filtro de salida LC.",
      }),
    }),
    Object.freeze({
      id: "boost",
      status: "available",
      name: Object.freeze({
        en: "Boost converter",
        fr: "Convertisseur boost",
        es: "Convertidor boost",
      }),
      description: Object.freeze({
        en: "Step-up converter with synchronous or diode switching.",
        fr: "Convertisseur élévateur à commutation synchrone ou par diode.",
        es: "Convertidor elevador con conmutación síncrona o mediante diodo.",
      }),
    }),
    Object.freeze({
      id: "pont-h",
      status: "available",
      name: Object.freeze({
        en: "H-bridge",
        fr: "Pont en H",
        es: "Puente H",
      }),
      description: Object.freeze({
        en: "Inverter, DC motor drive and grid connection with bipolar or unipolar PWM.",
        fr: "Onduleur, entraînement de moteur CC et connexion réseau en PWM bipolaire ou unipolaire.",
        es: "Inversor, accionamiento de motor CC y conexión a red con PWM bipolar o unipolar.",
      }),
    }),
    Object.freeze({
      id: "pv-grid",
      status: "available",
      name: Object.freeze({
        en: "Solar PV → grid",
        fr: "PV solaire → réseau",
        es: "PV solar → red",
      }),
      description: Object.freeze({
        en: "Full chain: solar array, MPPT boost, DC bus and H-bridge injecting sinusoidal current into the grid.",
        fr: "Chaîne complète : champ PV, boost MPPT, bus continu et pont en H injectant un courant sinusoïdal au réseau.",
        es: "Cadena completa: campo PV, boost con MPPT, bus continuo y puente H inyectando corriente senoidal a la red.",
      }),
    }),
  ]);
})();
