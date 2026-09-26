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
      conversion: "AC → DC",
      description: Object.freeze({
        en: "Turns an AC voltage into a DC voltage.",
        fr: "Transforme une tension alternative en tension continue.",
        es: "Convierte una tensión alterna en tensión continua.",
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
      conversion: "AC → AC",
      description: Object.freeze({
        en: "Adjusts the power sent to a load (lamp, heater).",
        fr: "Règle la puissance envoyée à une charge (lampe, chauffage).",
        es: "Regula la potencia entregada a una carga (lámpara, calefactor).",
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
      conversion: "DC → DC",
      description: Object.freeze({
        en: "Steps a DC voltage down.",
        fr: "Abaisse une tension continue.",
        es: "Reduce una tensión continua.",
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
      conversion: "DC → DC",
      description: Object.freeze({
        en: "Steps a DC voltage up.",
        fr: "Élève une tension continue.",
        es: "Eleva una tensión continua.",
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
      conversion: "DC → AC",
      description: Object.freeze({
        en: "Makes an AC voltage or drives a DC motor.",
        fr: "Crée une tension alternative ou pilote un moteur.",
        es: "Genera una tensión alterna o controla un motor.",
      }),
    }),
    Object.freeze({
      id: "pv-grid",
      status: "available",
      name: Object.freeze({
        en: "Solar PV → grid",
        fr: "Solaire PV → réseau",
        es: "Solar FV → red",
      }),
      conversion: "DC → AC",
      description: Object.freeze({
        en: "Feeds solar-panel energy into the grid.",
        fr: "Injecte l’énergie des panneaux solaires dans le réseau.",
        es: "Inyecta la energía de paneles solares en la red.",
      }),
    }),
  ]);
})();
