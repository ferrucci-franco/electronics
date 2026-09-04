(() => {
  "use strict";

  window.converterTopologies = Object.freeze([
    Object.freeze({
      id: "redresseur",
      status: "available",
      name: Object.freeze({
        en: "Diode rectifier",
        fr: "Redresseur à diodes",
        es: "Rectificador de diodos",
      }),
      description: Object.freeze({
        en: "Single-diode or full-bridge AC-DC rectifier with L-C filter and R–L load.",
        fr: "Redresseur AC-DC à simple diode ou pont de diodes, filtre L-C et charge R–L.",
        es: "Rectificador AC-DC de diodo simple o puente de diodos, filtro L-C y carga R–L.",
      }),
    }),
    Object.freeze({
      id: "thyristor",
      status: "available",
      name: Object.freeze({
        en: "Power control",
        fr: "Commande de puissance",
        es: "Control de potencia",
      }),
      description: Object.freeze({
        en: "Phase-angle power control using an SCR for one half-cycle or a TRIAC for both half-cycles, with an R–L load.",
        fr: "Commande de puissance par angle de phase : SCR sur une alternance ou TRIAC sur les deux, avec charge R–L.",
        es: "Control de potencia por ángulo de fase: SCR en un semiciclo o TRIAC en ambos, con carga R–L.",
      }),
    }),
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
