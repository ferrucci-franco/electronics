/*  ===========================================================================
    ESP32 WROOM-32 — ADC → (FIR/IIR) → DAC @ Fs
    Valeurs par défaut au démarrage (sans PC) :
      - Fs = 1000 Hz
      - FIR moyenne mobile de 10 : b = [0.1,...,0.1]
      - Mode filtre (bypass OFF)
      - AC OFF

    Core ESP32 Arduino 3.x (testé avec 3.3.2) :
      - Timer API : timerBegin(frequency), timerAttachInterrupt, timerAlarm(...)
    ===========================================================================
*/

#include <Arduino.h>

// ========================== Broches et résolutions ===========================
#define ADC_PIN           34        // ADC1_CH6 (entrée analogique)
#define DAC_PIN           25        // DAC1 (GPIO25) — ESP32 classique
#define PIN_PROBE         27        // broche sonde (carrée ~Fs/2)

#define ADC_BITS          12
#define DAC_BITS           8        // ESP32 DAC : 8 bits
#define ADC_MAX_CODE      4095U
#define DAC_MAX_CODE       255U

// ========================== Paramètres de filtre =============================
#define MAX_NX            32        // taps FIR max
#define MAX_NY            32        // ordre IIR max (nb d'éléments a[1..ny])

// Fréquences autorisées (Hz) - max 10kHz pour ESP32 (ISR trop lente pour 20kHz)
static const uint32_t kAllowedFs[] = {500, 1000, 5000, 10000};
static const uint8_t  kAllowedFsCount = sizeof(kAllowedFs)/sizeof(kAllowedFs[0]);

// =================== ÉTAT DU SYSTÈME / FILTRE (PARTAGÉ) =====================
hw_timer_t* sampleTimer = nullptr;

volatile bool     timerRunning   = false;
volatile bool     bypassEnabled  = false;  // par défaut OFF → mode filtre
volatile uint32_t fs_hz          = 1000;   // par défaut 1000 Hz

volatile uint32_t poll_ticks_th  = 50;
volatile uint32_t tick_count     = 0;
volatile bool     poll_request   = false;

// Mode AC
volatile bool  acModeEnabled = false; // par défaut AC OFF
volatile float acOffsetRef   = 0.5f;  // sans importance si AC OFF

// Coefficients et tailles
volatile uint8_t  nx = 1;
volatile uint8_t  ny = 0;
volatile float    b_coef[MAX_NX];          // b[0..nx-1]
volatile float    a_coef[MAX_NY];          // a[1..ny]

// Historiques
static float   x_hist[MAX_NX];
static float   y_hist[MAX_NY];
static uint8_t x_head = 0;
static uint8_t y_head = 0;

// Échantillon en attente pour le prochain tick (code DAC 0..255)
volatile uint16_t pendingSample = 0;

// Pré-calculs
static const float INV_ADC_MAX_F = 1.0f / float(ADC_MAX_CODE);
static const float DAC_MAX_F     = float(DAC_MAX_CODE);

// ====================== Utilitaires ======================
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
}

// ============================ Étape de filtrage ==============================
static inline uint16_t filter_step(uint16_t x_code) {
  if (bypassEnabled) {
    // ADC 12b -> DAC 8b (remise à l'échelle)
    int y_code_bp = int((float)x_code * (float)DAC_MAX_CODE / (float)ADC_MAX_CODE + 0.5f);
    return clamp_u16_int(y_code_bp, 0, DAC_MAX_CODE);
  }

  // 1) Normalise 0..1
  float x_now = float(x_code) * INV_ADC_MAX_F;

  // 2) AC optionnel
  bool ac_on; float ac_ref;
  noInterrupts(); ac_on = acModeEnabled; ac_ref = acOffsetRef; interrupts();
  if (ac_on) x_now -= ac_ref;

  // 3) Historique x
  push_x(x_now);

  // 4) Snapshot nx/ny
  noInterrupts();
  uint8_t nx_loc = nx;
  uint8_t ny_loc = ny;
  interrupts();

  // 5) DF-I
  float acc = 0.0f;

  // FIR: Σ b[k] x[n-k]
  for (uint8_t k=0; k<nx_loc; ++k) {
    float bk;
    noInterrupts(); bk = b_coef[k]; interrupts();
    acc += bk * get_x_hist(k);
  }
  // IIR: - Σ a[k] y[n-k], k=1..ny
  for (uint8_t k=1; k<=ny_loc; ++k) {
    float ak;
    noInterrupts(); ak = a_coef[k-1]; interrupts();
    acc -= ak * get_y_hist(k-1);
  }

  // 6) Historique y
  push_y(acc);

  // 7) Rebiais si AC ON
  float y_out = acc;
  if (ac_on) y_out += ac_ref;

  // 8) float -> DAC 8b
  int y_code = int(y_out * DAC_MAX_F + 0.5f);
  return clamp_u16_int(y_code, 0, DAC_MAX_CODE);
}

// ============================ ISR du timer ===================================
void IRAM_ATTR on_timer_irq() {
  // Broche sonde : carrée ~Fs/2
  static bool tgl = false;
  tgl = !tgl;
  digitalWrite(PIN_PROBE, tgl);

  // 1) DAC y[n-1]
  dacWrite(DAC_PIN, (uint8_t)pendingSample);
  // 2) ADC x[n]
  uint16_t x_now_code = analogRead(ADC_PIN);
  // 3) filtre y[n]
  uint16_t y_now_code = filter_step(x_now_code);
  // 4) sauvegarde pour le prochain tick
  pendingSample = y_now_code;

  // (optionnel) Scheduler léger
  tick_count++;
  if (tick_count >= poll_ticks_th) {
    tick_count = 0;
    poll_request = true;
  }
}

// ======================= (Re)programmation du timer ==========================
// Core 3.x : timerBegin(frequency), timerAttachInterrupt, timerAlarm(timer, time_us, auto_reload, reload_count)
void reprogram_timer(uint32_t new_fs) {
  // Arrête/supprime le timer précédent s'il existe
  if (sampleTimer) {
    timerEnd(sampleTimer);
    sampleTimer = nullptr;
    timerRunning = false;
  }

  fs_hz = new_fs;

  // ~50 ms de ticks (pour le pseudo-scheduler)
  if      (fs_hz >= 10000) poll_ticks_th = 500;
  else if (fs_hz >= 5000)  poll_ticks_th = 250;
  else if (fs_hz >= 1000)  poll_ticks_th = 50;
  else                     poll_ticks_th = 25;

  // Timer à 1 MHz (1 tick = 1 us), période en microsecondes :
  const uint32_t timer_freq_hz = 1000000UL;
  uint64_t period_us = 1000000ULL / (uint64_t)new_fs;
  if (period_us < 2ULL) period_us = 2ULL;

  sampleTimer = timerBegin(timer_freq_hz);
  if (!sampleTimer) return;

  timerAttachInterrupt(sampleTimer, &on_timer_irq);
  // auto_reload = true (périodique), reload_count = 0
  timerAlarm(sampleTimer, period_us, /*auto_reload*/ true, /*reload_count*/ 0);

  timerRunning = true;
}

// ========================= Parser de listes (pour série) =====================
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
    String tok = s.substring(l+1, r).substring(p, q);
    tok.trim();
    if (tok.length() > 0) out[count++] = tok.toFloat();
    p = q + 1;
  }
  return count;
}

bool is_allowed_fs(uint32_t f) {
  for (uint8_t i=0;i<kAllowedFsCount;++i) if (kAllowedFs[i] == f) return true;
  return false;
}

// =========================== GESTION COMMANDES ==============================
void print_help() {
  Serial.println(F("Commandes :"));
  Serial.println(F("  fs <500|1000|5000|10000>            : règle la Fs (Hz)"));
  Serial.println(F("  fir [b0,b1,...]                     : charge un filtre FIR"));
  Serial.println(F("  iir [b0,b1,...] [a1,a2,...]         : charge un filtre IIR (a0=1)"));
  Serial.println(F("  bypass                              : ADC→DAC direct (sans filtre)"));
  Serial.println(F("  filter                              : filtre actif (désactive bypass)"));
  Serial.println(F("  ac on|off                           : active/désactive le mode AC"));
  Serial.println(F("  ac set <valeur 0..1>                : fixe le biais AC (ex: 0.5000)"));
  Serial.println(F("  show                                : affiche la configuration"));
  Serial.println(F("  model                               : retourne le modèle (ESP32)"));
  Serial.println(F("  vref                                : retourne la tension Vref (3.3)"));
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
  Serial.print(F("Type = ")); Serial.println(ny_loc==0 ? F("FIR") : F("IIR"));
  Serial.print(F("AC mode = ")); Serial.println(ac_on ? F("ON") : F("OFF"));
  Serial.print(F("AC offset ref = ")); Serial.println(ac_ref, 6);

  Serial.print(F("b[0..")); Serial.print(nx_loc-1); Serial.println(F("] = ["));
  for (uint8_t i=0;i<nx_loc;++i) {
    noInterrupts(); float v = b_coef[i]; interrupts();
    Serial.print(v, 7);
    if (i+1<nx_loc) Serial.print(F(", "));
  }
  Serial.println(F("]"));

  Serial.print(F("a[1..")); Serial.print(ny_loc); Serial.println(F("] = ["));
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

  String lower = line; lower.toLowerCase();

  if (lower.startsWith("help")) { print_help(); return; }
  if (lower.startsWith("show")) { print_config(); return; }
  if (lower.startsWith("model")) { Serial.println(F("ESP32")); return; }
  if (lower.startsWith("vref")) { Serial.println(F("3.3")); return; }

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
      Serial.println(F("Erreur: Fs non autorisée. Utiliser 500|1000|5000|10000."));
      return;
    }
    noInterrupts(); reprogram_timer((uint32_t)f); interrupts();
    Serial.print(F("Fs = ")); Serial.print(f); Serial.println(F(" Hz (OK)"));
    return;
  }

  if (lower.startsWith("fir")) {
    float btmp[MAX_NX];
    int nb = parse_float_list(line, 0, btmp, MAX_NX);
    if (nb <= 0) {
      Serial.println(F("Erreur FIR. Ex: fir [0.5,0.4,0.1]"));
      return;
    }
    noInterrupts();
    for (int i=0;i<nb;++i) b_coef[i] = btmp[i];
    nx = (uint8_t)nb;
    ny = 0; // FIR
    filter_init();
    interrupts();
    Serial.print(F("FIR chargé: nx=")); Serial.println(nb);
    return;
  }

  if (lower.startsWith("iir")) {
    float btmp[MAX_NX], atmp[MAX_NY];
    int nb = parse_float_list(line, 0, btmp, MAX_NX);
    if (nb <= 0) {
      Serial.println(F("Erreur IIR. Ex: iir [b0,b1] [a1,a2]"));
      return;
    }
    int firstClose = line.indexOf(']');
    int na = parse_float_list(line, firstClose+1, atmp, MAX_NY);
    if (na < 0) {
      Serial.println(F("Manque [a1,a2,...] (a0=1 implicite)."));
      return;
    }
    noInterrupts();
    for (int i=0;i<nb;++i) b_coef[i] = btmp[i];
    for (int i=0;i<na;++i) a_coef[i] = atmp[i];
    nx = (uint8_t)nb;
    ny = (uint8_t)na;
    filter_init();
    interrupts();
    Serial.print(F("IIR chargé: nx=")); Serial.print(nb);
    Serial.print(F(", ny=")); Serial.println(na);
    return;
  }

  // AC
  if (lower.startsWith("ac on"))  { noInterrupts(); acModeEnabled = true;  interrupts(); Serial.println(F("AC ON"));  return; }
  if (lower.startsWith("ac off")) { noInterrupts(); acModeEnabled = false; interrupts(); Serial.println(F("AC OFF")); return; }
  if (lower.startsWith("ac set ")) {
    String sv = line.substring(7); sv.trim();
    float v = sv.toFloat();
    if (v < 0.0f || v > 1.0f) {
      Serial.println(F("ac set [0..1], ex: ac set 0.5"));
      return;
    }
    noInterrupts(); acOffsetRef = v; interrupts();
    Serial.print(F("AC offset ref = ")); Serial.println(v, 6);
    return;
  }

  Serial.println(F("Commande inconnue. 'help' pour aide."));
}

// ================================ SETUP =====================================
void setup() {
  pinMode(PIN_PROBE, OUTPUT);
  digitalWrite(PIN_PROBE, LOW);

  // Serial optionnel (ne bloque pas s'il n'y a pas de PC)
  Serial.begin(115200);

  // ADC/DAC
  analogReadResolution(ADC_BITS);
  // DAC ESP32 utilise 8 bits implicites → dacWrite(DAC_PIN, val)

  // -------- Valeurs par défaut --------
  // FIR moyenne mobile de 10
  static const uint8_t kMA_N = 10;
  static const float   kMA10[kMA_N] = {0.1f,0.1f,0.1f,0.1f,0.1f,0.1f,0.1f,0.1f,0.1f,0.1f};

  noInterrupts();
  for (uint8_t i=0;i<kMA_N;++i) b_coef[i] = kMA10[i];
  nx = kMA_N;
  ny = 0;                   // FIR
  bypassEnabled = false;    // mode filtre
  acModeEnabled = false;    // AC OFF
  acOffsetRef   = 0.5f;
  interrupts();

  filter_init();

  // Premier calcul pour initialiser pendingSample
  uint16_t x0 = analogRead(ADC_PIN);
  pendingSample = filter_step(x0);

  // Démarre Fs=1000 Hz SANS dépendre de Serial
  reprogram_timer(1000);

  if (Serial) {
    Serial.println(F("Démarrage: Fs=1000Hz, FIR MA10, FILTRE actif, AC OFF."));
  }
}

// ================================= LOOP =====================================
void loop() {
  // Parser de commandes série (si PC connecté). Sinon, ne gêne pas.
  static char lineBuf[256];
  static size_t lineLen = 0;

  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      lineBuf[lineLen] = '\0';
      handle_line(String(lineBuf));
      lineLen = 0;
    } else if (lineLen + 1 < sizeof(lineBuf)) {
      lineBuf[lineLen++] = c;
    }
  }

  // (Réservé pour futures tâches légères si poll_request == true)
  if (poll_request) {
    poll_request = false;
  }
}
