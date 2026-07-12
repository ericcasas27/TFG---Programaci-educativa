#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID  "12345678-1234-5678-1234-56789abcdef0"
#define CHAR_UUID     "12345678-1234-5678-1234-56789abcdef1"

// Pins L298N #1 (motors laterals)
// ENA i ENB: pont directe a 5V del L298N
#define MOT_ESQ_ENA  27
#define MOT_ESQ_IN1  25
#define MOT_ESQ_IN2  26
#define MOT_DRET_ENB 13
#define MOT_DRET_IN3 14
#define MOT_DRET_IN4 12

// Pins L298N #2 (motor vertical)
// ENA: pont directe a 5V del L298N
// Canal B del L298N #2 no s'usa
#define MOT_VERT_ENA  5
#define MOT_VERT_IN1 19
#define MOT_VERT_IN2 18

bool deviceConnected = false;
String bufferRebut   = "";
bool   executant     = false;

// Marcador de fi de seqüència
const char* MARCADOR_FI = "{FINAL,0}";

struct Comanda {
  String cmd;
  unsigned long ms;
};

// La sequencia arriba ja expandida des de l'App (sense bucles).
// 128 ordres màxim
Comanda       cuaComandes[128];
int           cuaLongitud  = 0;
int           cuaIndex     = 0;
unsigned long iniciComanda = 0;

// --- Helpers motors ---

void motorEsquerreEndavant() { digitalWrite(MOT_ESQ_IN1, HIGH); digitalWrite(MOT_ESQ_IN2, LOW);  }
void motorEsquerreEnrere()   { digitalWrite(MOT_ESQ_IN1, LOW);  digitalWrite(MOT_ESQ_IN2, HIGH); }
void motorEsquerreStop()     { digitalWrite(MOT_ESQ_IN1, LOW);  digitalWrite(MOT_ESQ_IN2, LOW);  }

void motorDretEndavant()     { digitalWrite(MOT_DRET_IN3, HIGH); digitalWrite(MOT_DRET_IN4, LOW);  }
void motorDretEnrere()       { digitalWrite(MOT_DRET_IN3, LOW);  digitalWrite(MOT_DRET_IN4, HIGH); }
void motorDretStop()         { digitalWrite(MOT_DRET_IN3, LOW);  digitalWrite(MOT_DRET_IN4, LOW);  }

void motorVerticalAmunt()    { digitalWrite(MOT_VERT_IN1, HIGH); digitalWrite(MOT_VERT_IN2, LOW);  }
void motorVerticalAvall()    { digitalWrite(MOT_VERT_IN1, LOW);  digitalWrite(MOT_VERT_IN2, HIGH); }
void motorVerticalStop()     { digitalWrite(MOT_VERT_IN1, LOW);  digitalWrite(MOT_VERT_IN2, LOW);  }

void totStop() {
  motorEsquerreStop();
  motorDretStop();
  motorVerticalStop();
}

void aplicarComanda(const String& cmd) {
  totStop();
  if      (cmd == "FORWARD") { motorEsquerreEndavant(); motorDretEndavant(); }
  else if (cmd == "BACK")    { motorEsquerreEnrere();   motorDretEnrere();   }
  else if (cmd == "RIGHT")   { motorEsquerreEndavant(); motorDretEnrere();   }
  else if (cmd == "LEFT")    { motorEsquerreEnrere();   motorDretEndavant(); }
  else if (cmd == "UP")      { motorVerticalAmunt(); }
  else if (cmd == "DOWN")    { motorVerticalAvall(); }
  else if (cmd == "QUIET")   { /* no cal fer res: totStop() ja ha aturat els motors */ }
  else if (cmd == "FINAL")   { /* marca la fi del programa; no cal fer res més */ }
}

// Rep una cadena tipus "{FORWARD,2000}{RIGHT,1000}"
// i la converteix en la cua de comandes.
void parsarSequencia(const String& seq) {
  cuaLongitud = 0;
  int pos = 0;
  while (pos < (int)seq.length() && cuaLongitud < 128) {
    int obert  = seq.indexOf('{', pos);
    int tancat = seq.indexOf('}', obert);
    if (obert == -1 || tancat == -1) break;
    String interior = seq.substring(obert + 1, tancat);
    int comes = interior.indexOf(',');
    if (comes != -1) {
      cuaComandes[cuaLongitud].cmd = interior.substring(0, comes);
      cuaComandes[cuaLongitud].ms  = interior.substring(comes + 1).toInt();
      cuaLongitud++;
    }
    pos = tancat + 1;
  }
}

void iniciarExecucio() {
  if (cuaLongitud == 0) return;
  cuaIndex     = 0;
  executant    = true;
  iniciComanda = millis();
  aplicarComanda(cuaComandes[0].cmd);
  Serial.printf("Iniciant. Total comandes: %d\n", cuaLongitud);
  Serial.printf("Comanda 1/%d: %s (%lu ms)\n",cuaLongitud,cuaComandes[0].cmd.c_str(),cuaComandes[0].ms);
  executant = true;
}

// --- Callbacks BLE ---

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("Dispositiu connectat");
  }
  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    totStop();
    executant = false;
    Serial.println("Dispositiu desconnectat");
    BLEDevice::startAdvertising();
  }
};

class CharCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    String val = c->getValue();
    bufferRebut += val;

    Serial.printf("Fragment rebut (%d bytes). Buffer total: %d bytes\n",
                  (int)val.length(), (int)bufferRebut.length());

    // La sequencia esta completa quan arriba el marcador {FINAL,0}
    if (bufferRebut.endsWith(MARCADOR_FI)) {
      Serial.println("Sequencia completa rebuda:");
      Serial.println(bufferRebut);
      totStop();
      parsarSequencia(bufferRebut);
      bufferRebut = "";
      iniciarExecucio();
    }
  }
};

// --- Setup ---

void setup() {
  Serial.begin(115200);
  Serial.println("TeleROV ESP32 iniciant...");

  int pins[] = {
    MOT_ESQ_ENA, MOT_ESQ_IN1, MOT_ESQ_IN2,
    MOT_DRET_ENB, MOT_DRET_IN3, MOT_DRET_IN4,
    MOT_VERT_ENA, MOT_VERT_IN1, MOT_VERT_IN2
  };
  for (int p : pins) {
    pinMode(p, OUTPUT);
    digitalWrite(p, LOW);
  }
  digitalWrite(MOT_ESQ_ENA,  HIGH);
  digitalWrite(MOT_DRET_ENB, HIGH);
  digitalWrite(MOT_VERT_ENA, HIGH);

  //AQUEST ÉS EL NOM QUE S'HA DE CANVIAR!!
  BLEDevice::init("TeleROV"); 
  //POSEU UN NÚMERO O ALGUNA COSA A CONTINUACIÓ DE TeleROV PER A PODER-LO IDENTIFICAR. 
  //SI EL NOM DEL PROGROGRAMA NO COMENÇA PER TeleROV, EL PROGRAMA NO EL TROBARÀ!

  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService* servei = server->createService(SERVICE_UUID);
  BLECharacteristic* car = servei->createCharacteristic(
    CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR
  );
  car->setCallbacks(new CharCallbacks());
  servei->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.println("BLE actiu. Esperant connexio...");
}

// --- Loop ---: Controla el temps

void loop() {
  if (!executant) return;

  unsigned long ara    = millis();
  unsigned long passat = ara - iniciComanda;
  unsigned long durada = cuaComandes[cuaIndex].ms;

  if (passat >= durada) {
    cuaIndex++;
    if (cuaIndex >= cuaLongitud) {
      totStop();
      executant = false;
      Serial.println("Sequencia completada");
    } else {
      iniciComanda = ara;
      aplicarComanda(cuaComandes[cuaIndex].cmd);
      Serial.printf("Comanda %d/%d: %s (%lu ms)\n",
                    cuaIndex + 1, cuaLongitud,
                    cuaComandes[cuaIndex].cmd.c_str(),
                    cuaComandes[cuaIndex].ms);
    }
  }
}
