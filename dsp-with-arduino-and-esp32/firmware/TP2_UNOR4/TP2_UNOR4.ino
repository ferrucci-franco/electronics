/*  ===========================================================================
    UNO R4 (RA4M1) — ADC A1 → filtre (FIR / RII / biquads en cascade) → DAC A0
    Version du programme : 2.0  (commande 'version' → "FW 2.0")

    - Tick périodique matériel via FspTimer (gigue très faible)
    - Démarre seul à la mise sous tension : la sortie recopie l'entrée (y = x)
      tant qu'aucune configuration n'a été envoyée — pas besoin d'ouvrir le port série.
    - Commandes série : fs / fir / iir / sos / bypass / filter / ac / show / version / help
    - fir / iir : un seul polynôme en z^-1 (forme directe I)
        H(z) = (Σ b[k] z^-k) / (1 + Σ a[k] z^-k)   (a0 = 1 implicite)
    - sos : cascade de cellules du second ordre (biquads, forme directe II transposée),
      numériquement robuste en float32 jusqu'à l'ordre 8 (4 cellules)
        sos [b0,b1,b2,a1,a2, b0,b1,b2,a1,a2, ...]   (a0 = 1 implicite pour chaque cellule)
    - Latence : 1 échantillon (le DAC sort y[n-1] pendant que y[n] est calculé)
    - D7 : carré à Fs/2 (contrôle de Fs)   D8 : à 1 pendant le calcul d'un échantillon
      (largeur de l'impulsion = temps de calcul ; doit rester bien inférieure à 1/Fs)

    Mode AC (optionnel)
      - Avant filtrage : x <- x - acOffsetRef       (centre la mesure autour de 0)
      - Après filtrage : y <- y + acOffsetRef       (re-biais pour le DAC 0..1)
      - Commandes : 'ac on' / 'ac off' / 'ac set <valeur>'
    ===========================================================================
*/

#include <FspTimer.h>

// ========================== PARAMÈTRES GÉNÉRAUX =============================
#define ADC_PIN           A1        // entrée analogique
#define DAC_PIN           A0        // sortie DAC
#define ADC_BITS          12
#define DAC_BITS          12
#define ADC_MAX_CODE      4095U
#define DAC_MAX_CODE      4095U
#define MAX_NX            32        // taps FIR max
#define MAX_NY            32        // ordre IIR max (nb d'éléments a[1..ny])
#define SERIAL_BAUD       115200
#define LINE_MAX_LEN      512
#define PIN_PROBE         7         // carré à Fs/2
#define PIN_BUSY          8         // à 1 pendant le calcul d'un échantillon
#define MAX_SOS           4         // cellules du second ordre (ordre 8 au maximum)
#define FW_VERSION        "2.0"

// Fréquences autorisées (Hz)
static const uint32_t kAllowedFs[] = {500, 1000, 5000, 10000, 20000};
static const uint8_t  kAllowedFsCount = sizeof(kAllowedFs)/sizeof(kAllowedFs[0]);

// =================== ÉTAT DU SYSTÈME / FILTRE (PARTAGÉ) =====================
FspTimer sampleTimer;

volatile bool     timerRunning   = false;
volatile bool     bypassEnabled  = false;

volatile uint32_t fs_hz          = 1000;   // Fs actuelle
volatile uint32_t poll_ticks_th  = 50;     // ~50 ms en ticks (dépend de Fs)
volatile uint32_t tick_count     = 0;
volatile bool     poll_request   = false;  // ISR -> loop() : relire commandes

// --- Mode AC : traitement du décalage DC ---
volatile bool  acModeEnabled = true;   // ON par défaut : centrer autour de 0
volatile float acOffsetRef   = 0.5f;   // référence de biais (0..1), typ. Vref/2

// Coefficients et tailles courantes
volatile uint8_t  nx = 1;                  // nb de b[k] utilisés (>=1)
volatile uint8_t  ny = 0;                  // nb de a[k] utilisés (>=0)
volatile float    b_coef[MAX_NX];          // b[0..nx-1]
volatile float    a_coef[MAX_NY];          // a[1..ny] (a0=1 implicite)

// Cascade de biquads (prioritaire si nsos > 0) : [b0, b1, b2, a1, a2] par cellule
volatile uint8_t  nsos = 0;
volatile float    sos_coef[MAX_SOS][5];
static float      sos_s1[MAX_SOS];          // états de la forme directe II transposée
static float      sos_s2[MAX_SOS];

// Tampons circulaires pour l’historique (calculs en float)
static float   x_hist[MAX_NX];
static float   y_hist[MAX_NY];
static uint8_t x_head = 0;
static uint8_t y_head = 0;

// Échantillon prêt pour le prochain tick (code entier DAC)
volatile uint16_t pendingSample = 0;

// Pré-calculs utiles
static const float INV_ADC_MAX_F = 1.0f / float(ADC_MAX_CODE);
static const float DAC_MAX_F     = float(DAC_MAX_CODE);

// ====================== OUTILS : CLAMP / HISTORIQUES ========================
static inline uint16_t clamp_u16_int(int v, int vmin, int vmax) {
  if (v < vmin) return (uint16_t)vmin;
  if (v > vmax) return (uint16_t)vmax;
  return (uint16_t)v;
}

static inline float get_x_hist(int k) {
  uint8_t idx = (x_head + MAX_NX - (k % MAX_NX)) % MAX_NX;
  return x_hist[idx];
}
static inline float get_y_hist(int k) {
  if (MAX_NY == 0) return 0.0f;
  uint8_t idx = (y_head + MAX_NY - (k % MAX_NY)) % MAX_NY;
  return y_hist[idx];
}
static inline void push_x(float x_now) {
  x_head = (x_head + 1) % MAX_NX;
  x_hist[x_head] = x_now;
}
static inline void push_y(float y_now) {
  if (MAX_NY == 0) return;
  y_head = (y_head + 1) % MAX_NY;
  y_hist[y_head] = y_now;
}

static void filter_init() {
  for (int i=0;i<MAX_NX;++i) x_hist[i] = 0.0f;
  for (int i=0;i<MAX_NY;++i) y_hist[i] = 0.0f;
  x_head = 0;
  y_head = 0;
  for (int i=0;i<MAX_SOS;++i) { sos_s1[i] = 0.0f; sos_s2[i] = 0.0f; }
}

// ============================ ÉTAPE DE FILTRE ===============================
static inline uint16_t filter_step(uint16_t x_code) {
  if (bypassEnabled) {
    return x_code; // ADC → DAC direct
  }

  // 1) Normalisation unipolaire 0..1 (ADC 0..Vref -> 0..1)
  float x_now = float(x_code) * INV_ADC_MAX_F;

  // 2) Option AC : retirer le biais DC avant le filtrage (centrage autour de 0)
  bool ac_on;
  float ac_ref;
  noInterrupts(); ac_on = acModeEnabled; ac_ref = acOffsetRef; interrupts();
  if (ac_on) {
    x_now -= ac_ref;          // typiquement 0.5 => plage ~[-0.5..+0.5]
  }

  float acc = 0.0f;

  // 3') Cascade de biquads (forme directe II transposée), si chargée
  uint8_t ns_loc = nsos;
  if (ns_loc > 0) {
    float v = x_now;
    for (uint8_t i=0; i<ns_loc; ++i) {
      const float b0 = sos_coef[i][0], b1 = sos_coef[i][1], b2 = sos_coef[i][2];
      const float a1 = sos_coef[i][3], a2 = sos_coef[i][4];
      const float w = b0 * v + sos_s1[i];
      sos_s1[i] = b1 * v - a1 * w + sos_s2[i];
      sos_s2[i] = b2 * v - a2 * w;
      v = w;
    }
    acc = v;
  } else {

  // 3) Historique x[n]
  push_x(x_now);

  // 4) Snapshot atomique des tailles
  noInterrupts();
  uint8_t nx_loc = nx;
  uint8_t ny_loc = ny;
  interrupts();

  // 5) Accumulateur Direct Form I

  // FIR : Σ b[k] * x[n-k]
  for (uint8_t k=0; k<nx_loc; ++k) {
    float bk;
    noInterrupts(); bk = b_coef[k]; interrupts();
    acc += bk * get_x_hist(k);
  }

  // IIR : - Σ a[k] * y[n-k], où a[k] = a_coef[k-1], k=1..ny
  for (uint8_t k=1; k<=ny_loc; ++k) {
    float ak;
    noInterrupts(); ak = a_coef[k-1]; interrupts();
    acc -= ak * get_y_hist(k-1);
  }

  // 6) Historique y[n]
  push_y(acc);
  }  // fin de la branche polynôme (fir / iir)

  // 7) Re-biais éventuel pour le DAC (revenir à 0..1)
  float y_out = acc;
  if (ac_on) {
    y_out += ac_ref;          // remettre le biais (typ. +0.5) avant DAC
  }

  // 8) Conversion float -> code DAC (arrondi + clamp)
  int y_code = int(y_out * DAC_MAX_F + 0.5f);
  return clamp_u16_int(y_code, 0, DAC_MAX_CODE);
}

// ============================ ISR DU TIMER ==================================
static void on_timer_irq(timer_callback_args_t * /*args*/) {
  // 0) Indicateur de tick (sonde) :
  static bool tgl = false;
  tgl = !tgl;
  digitalWrite(PIN_PROBE, tgl);  // carrée à Fs/2
  digitalWrite(PIN_BUSY, HIGH);  // début du calcul

  // 1) sortir y[n-1]
  analogWrite(DAC_PIN, pendingSample);
  // 2) lire x[n]
  uint16_t x_now_code = analogRead(ADC_PIN);
  // 3) calculer y[n]
  uint16_t y_now_code = filter_step(x_now_code);
  // 4) stocker pour le tick suivant
  pendingSample = y_now_code;
  digitalWrite(PIN_BUSY, LOW);   // fin du calcul

  // Scheduler léger pour lecture des commandes
  tick_count++;
  if (tick_count >= poll_ticks_th) {
    tick_count = 0;
    poll_request = true;
  }
}

// ======================= (RE)PROGRAMMATION DU TIMER =========================
void reprogram_timer(uint32_t new_fs) {
  if (timerRunning) {
    sampleTimer.stop();
    sampleTimer.close();
    sampleTimer.end();
    timerRunning = false;
  }

  fs_hz = new_fs;

  // ~50 ms worth of ticks
  if      (fs_hz >= 20000) poll_ticks_th = 1000;
  else if (fs_hz >= 10000) poll_ticks_th = 500;
  else if (fs_hz >= 5000)  poll_ticks_th = 250;
  else if (fs_hz >= 1000)  poll_ticks_th = 50;
  else                     poll_ticks_th = 25;

  // Choix prescaler + période entière pour Fs exacte
  timer_source_div_t div_sel;
  uint32_t pclk_hz = 48000000UL;   // PCLK du GPT (UNO R4 typique)
  uint32_t tick_hz;
  uint32_t period_counts;

  if (new_fs == 500 || new_fs == 1000) {
    div_sel = TIMER_SOURCE_DIV_128;              // 48e6 / 128 = 375 kHz
    tick_hz = pclk_hz / 128UL;
  } else {
    div_sel = TIMER_SOURCE_DIV_64;               // 48e6 / 64  = 750 kHz
    tick_hz = pclk_hz / 64UL;
  }
  period_counts = tick_hz / new_fs;

  // *** FIX: con DIV_128 el overflow te está disparando 2 veces (OVF+UDF).
  // Compensamos doblando el período efectivo SOLO en 500 y 1000 Hz:
  if (div_sel == TIMER_SOURCE_DIV_128) {
    period_counts *= 2U;
  }

  if (period_counts < 2U){
    period_counts = 2U;
  }

  uint8_t ttype  = GPT_TIMER;
  int8_t  tidx   = FspTimer::get_available_timer(ttype);
  if (tidx < 0) {
    tidx = FspTimer::get_available_timer(ttype, true);
    FspTimer::force_use_of_pwm_reserved_timer();
  }

  // begin avec période/rapport/diviseur (mode périodique, pas de PWM)
  if (!sampleTimer.begin(TIMER_MODE_PERIODIC, ttype, tidx,
                         period_counts, 0, div_sel,
                         on_timer_irq, nullptr)) {
    return;
  }
  if (!sampleTimer.setup_overflow_irq()) return;
  if (!sampleTimer.open())               return;
  if (!sampleTimer.start())              return;

  timerRunning = true;
}

// ========================= OUTILS PARSEUR DE LISTES =========================
int parse_float_list(const String &s, int startIdx, float *out, int maxOut) {
  int l = s.indexOf('[', startIdx);
  int r = s.indexOf(']', (l < 0 ? startIdx : l+1));
  if (l < 0 || r < 0 || r <= l) return -1;

  String inner = s.substring(l+1, r);
  inner.replace(';', ',');
  int count = 0;
  int p = 0;
  while (p < inner.length() && count < maxOut) {
    while (p < inner.length() && isspace(inner[p])) p++;
    int q = p;
    while (q < inner.length() && inner[q] != ',' ) q++;
    String tok = s.substring(l+1, r).substring(p, q); // garder format original
    tok.trim();
    if (tok.length() > 0) {
      out[count++] = tok.toFloat();
    }
    p = q + 1;
  }
  return count;
}

// ============================= VALIDATION Fs ================================
bool is_allowed_fs(uint32_t f) {
  for (uint8_t i=0;i<kAllowedFsCount;++i) if (kAllowedFs[i] == f) return true;
  return false;
}

// =========================== GESTION COMMANDES ==============================
void print_help() {
  Serial.println(F("Commandes :"));
  Serial.println(F("  fs <500|1000|5000|10000|20000>      : règle la Fs (Hz)"));
  Serial.println(F("  fir [b0,b1,...]                     : charge un filtre FIR"));
  Serial.println(F("  iir [b0,b1,...] [a1,a2,...]         : charge un filtre IIR (a0=1)"));
  Serial.println(F("  sos [b0,b1,b2,a1,a2, ...]           : cascade de biquads (max 4 cellules)"));
  Serial.println(F("  bypass                              : ADC→DAC direct (sans filtre)"));
  Serial.println(F("  filter                              : filtre actif (désactive bypass)"));
  Serial.println(F("  ac on|off                           : active/désactive le mode AC"));
  Serial.println(F("  ac set <valeur 0..1>                : fixe le biais AC (ex: 0.5000)"));
  Serial.println(F("  show                                : affiche la configuration"));
  Serial.println(F("  model                               : retourne le modèle (UNO_R4)"));
  Serial.println(F("  vref                                : retourne la tension Vref (5.0)"));
  Serial.println(F("  version                             : version du programme (FW x.y)"));
  Serial.println(F("  help                                : cette aide"));
}

void print_config() {
  noInterrupts();
  uint32_t fs = fs_hz;
  bool bp = bypassEnabled;
  uint8_t nx_loc = nx, ny_loc = ny;
  bool ac_on = acModeEnabled; float ac_ref = acOffsetRef;
  interrupts();

  Serial.print(F("Fs = ")); Serial.print(fs); Serial.println(F(" Hz"));
  Serial.print(F("Mode = ")); Serial.println(bp ? F("BYPASS") : F("FILTRE"));
  uint8_t ns_loc = nsos;
  Serial.print(F("Version = ")); Serial.println(F(FW_VERSION));
  Serial.print(F("Type = ")); Serial.println(ns_loc > 0 ? F("SOS") : (ny_loc==0 ? F("FIR") : F("IIR")));
  if (ns_loc > 0) {
    for (uint8_t i=0;i<ns_loc;++i) {
      Serial.print(F("cellule ")); Serial.print(i); Serial.print(F(" : ["));
      for (uint8_t k=0;k<5;++k) { Serial.print(sos_coef[i][k], 7); if (k<4) Serial.print(F(", ")); }
      Serial.println(F("]"));
    }
    Serial.print(F("AC mode = ")); Serial.println(ac_on ? F("ON") : F("OFF"));
    Serial.print(F("AC offset ref = ")); Serial.println(ac_ref, 6);
    return;
  }
  Serial.print(F("AC mode = ")); Serial.println(ac_on ? F("ON") : F("OFF"));
  Serial.print(F("AC offset ref = ")); Serial.println(ac_ref, 6);

  Serial.print(F("b[0..")); Serial.print(nx_loc-1); Serial.println(F("] ="));
  Serial.print(F("["));
  for (uint8_t i=0;i<nx_loc;++i) {
    noInterrupts(); float v = b_coef[i]; interrupts();
    Serial.print(v, 7);
    if (i+1<nx_loc) Serial.print(F(", "));
  }
  Serial.println(F("]"));
  Serial.print(F("a[1..")); Serial.print(ny_loc); Serial.println(F("] ="));
  Serial.print(F("["));
  for (uint8_t i=0;i<ny_loc;++i) {
    noInterrupts(); float v = a_coef[i]; interrupts();
    Serial.print(v, 7);
    if (i+1<ny_loc) Serial.print(F(", "));
  }
  Serial.println(F("]"));
}

void handle_line(String line) {
  line.trim();
  if (line.length()==0) return;

  line.replace("\t"," ");
  while (line.indexOf("  ")>=0) line.replace("  "," ");

  String lower = line;
  lower.toLowerCase();

  if (lower.startsWith("help")) { print_help(); return; }
  if (lower.startsWith("show")) { print_config(); return; }
  if (lower.startsWith("model")) { Serial.println(F("UNO_R4")); return; }
  if (lower.startsWith("vref")) { Serial.println(F("5.0")); return; }
  if (lower.startsWith("version")) { Serial.print(F("FW ")); Serial.println(F(FW_VERSION)); return; }

  if (lower.startsWith("bypass")) {
    noInterrupts(); bypassEnabled = true; interrupts();
    Serial.println(F("BYPASS active."));
    return;
  }
  if (lower.startsWith("filter")) {
    noInterrupts(); bypassEnabled = false; interrupts();
    Serial.println(F("Filtre actif."));
    return;
  }

  if (lower.startsWith("fs ")) {
    long f = lower.substring(3).toInt();
    if (!is_allowed_fs((uint32_t)f)) {
      Serial.println(F("Erreur: Fs non autorisée. Utiliser 500|1000|5000|10000|20000."));
      return;
    }
    reprogram_timer((uint32_t)f);   // arrête / relance le timer lui-même
    Serial.print(F("Fs = ")); Serial.print(f); Serial.println(F(" Hz (OK)"));
    return;
  }

  if (lower.startsWith("fir")) {
    float btmp[MAX_NX];
    int nb = parse_float_list(line, 0, btmp, MAX_NX);
    if (nb <= 0) {
      Serial.println(F("Erreur: syntaxe FIR. Exemple: fir [0.5, 0.4, 0.1]"));
      return;
    }
    noInterrupts();
    for (int i=0;i<nb;++i) b_coef[i] = btmp[i];
    nx = (uint8_t)nb;
    ny = 0; // FIR
    nsos = 0;
    filter_init();
    interrupts();
    Serial.print(F("FIR charge: nx=")); Serial.println(nb);
    return;
  }

  if (lower.startsWith("iir")) {
    float btmp[MAX_NX], atmp[MAX_NY];
    int nb = parse_float_list(line, 0, btmp, MAX_NX);
    if (nb <= 0) {
      Serial.println(F("Erreur: syntaxe IIR. Exemple: iir [b0,b1] [a1,a2]"));
      return;
    }
    int firstClose = line.indexOf(']');
    int na = parse_float_list(line, firstClose+1, atmp, MAX_NY);
    if (na < 0) {
      Serial.println(F("Erreur: il manque la liste [a1,a2,...] (a0=1 implicite)."));
      return;
    }
    noInterrupts();
    for (int i=0;i<nb;++i) b_coef[i] = btmp[i];
    for (int i=0;i<na;++i) a_coef[i] = atmp[i];
    nx = (uint8_t)nb;
    ny = (uint8_t)na;
    nsos = 0;
    filter_init();
    interrupts();
    Serial.print(F("IIR charge: nx=")); Serial.print(nb);
    Serial.print(F(", ny=")); Serial.println(na);
    return;
  }

  if (lower.startsWith("sos")) {
    float tmp[5*MAX_SOS];
    int nv = parse_float_list(line, 0, tmp, 5*MAX_SOS);
    if (nv <= 0 || (nv % 5) != 0) {
      Serial.println(F("Erreur: syntaxe SOS. Exemple: sos [b0,b1,b2,a1,a2, b0,b1,b2,a1,a2]"));
      return;
    }
    int ns = nv / 5;
    noInterrupts();
    for (int i=0;i<ns;++i) for (int k=0;k<5;++k) sos_coef[i][k] = tmp[5*i+k];
    nsos = (uint8_t)ns;
    filter_init();
    interrupts();
    Serial.print(F("SOS charge: ")); Serial.print(ns); Serial.println(F(" cellule(s)"));
    return;
  }

  // --- Commandes AC ---
  if (lower.startsWith("ac on")) {
    noInterrupts(); acModeEnabled = true; interrupts();
    Serial.println(F("AC mode: ON"));
    return;
  }
  if (lower.startsWith("ac off")) {
    noInterrupts(); acModeEnabled = false; interrupts();
    Serial.println(F("AC mode: OFF"));
    return;
  }
  if (lower.startsWith("ac set ")) {
    String sv = line.substring(7);  // garder format original (peut contenir décimales)
    sv.trim();
    float v = sv.toFloat();
    if (v < 0.0f || v > 1.0f) {
      Serial.println(F("Erreur: 'ac set' attend une valeur dans [0,1]. Exemple: ac set 0.5000"));
      return;
    }
    noInterrupts(); acOffsetRef = v; interrupts();
    Serial.print(F("AC offset ref = ")); Serial.println(v, 6);
    return;
  }

  Serial.println(F("Commande inconnue. Tapez 'help'."));
}

// ================================ SETUP =====================================
void setup() {
  pinMode(PIN_PROBE, OUTPUT);
  digitalWrite(PIN_PROBE, LOW);
  pinMode(PIN_BUSY, OUTPUT);
  digitalWrite(PIN_BUSY, LOW);

  Serial.begin(SERIAL_BAUD);
  // Pas d'attente du port USB : la carte filtre dès la mise sous tension.

  analogReadResolution(ADC_BITS);
  analogWriteResolution(DAC_BITS);

  noInterrupts();
  b_coef[0] = 1.0f; nx = 1;
  ny = 0;
  bypassEnabled = false;
  acModeEnabled = false;     // AC OFF par défaut
  acOffsetRef   = 0.5f;     // moitié d'échelle (Vref/2 -> 0.5)
  interrupts();

  filter_init();

  uint16_t x0 = analogRead(ADC_PIN);
  pendingSample = filter_step(x0);

  reprogram_timer(fs_hz);

  Serial.println(F("Pret. Tapez 'help' pour les commandes."));
}

// ================================= LOOP =====================================
void loop() {
  static char lineBuf[LINE_MAX_LEN];
  static size_t lineLen = 0;

  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      lineBuf[lineLen] = '\0';
      handle_line(String(lineBuf));
      lineLen = 0;
    } else if (lineLen + 1 < LINE_MAX_LEN) {
      lineBuf[lineLen++] = c;
    }
  }

  if (poll_request) {
    poll_request = false;
    // Extension future : rien à faire ici pour l’instant.
  }
}
