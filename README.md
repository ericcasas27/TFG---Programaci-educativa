# TeleROV

Aplicació web per programar per blocs un robot submarí de baix cost (ROV), pensada perquè infants i joves s'iniciïn en la programació i la robòtica de manera pràctica.

Projecte de Fi de Grau — Universitat de Girona

## Sobre el projecte

TeleROV permet controlar i programar un petit robot submarí de baix cost mitjançant blocs de programació visual, a l'estil de ScratchJr. Des del navegador, i sense instal·lar res, l'usuari arrossega blocs (moviments, girs, immersió...) per crear una seqüència, l'envia al robot per Bluetooth i en veu el resultat tant al robot real com en una representació 3D.

El projecte s'ha desenvolupat com a TFG del `Grau en Enginyeria Informàtica` a la Universitat de Girona, tutoritzat pel Dr. `Jordi Freixenet Bosch` i el Dr. `Xavier Cufí Solé`.

## Característiques

- Programació per blocs (drag & drop), inspirada en ScratchJr
- Connexió Bluetooth (BLE) amb el robot mitjançant la Web Bluetooth API
- Control d'un ROV real basat en ESP32 i drivers de motor L298
- Visualització 3D del robot amb Three.js
- Calibratge dels moviments
- Reptes (boies, temps límit...) per gamificar l'aprenentatge
- Comptes d'usuari vinculats a un centre educatiu, amb desat de programes
- Guia d'instal·lació i muntatge integrada a la mateixa aplicació

## Arquitectura i tecnologies

| Capa | Tecnologia |
|---|---|
| Frontend | React + Vite, Three.js |
| Backend | Netlify Functions (Node.js) |
| Base de dades | MongoDB (Mongoose) |
| Autenticació | JWT (jsonwebtoken) + bcryptjs |
| Comunicació amb el robot | Web Bluetooth API (BLE) |
| Microcontrolador | ESP32 (Arduino/C++) + drivers L298 |
| Desplegament | Netlify |

## Estructura del repositori

```
.
├── frontend/            # Aplicació React (Vite)
│   ├── src/             # Codi font: components, App.jsx, ...
│   └── public/
├── netlify/
│   └── functions/       # API serverless: login, registre, perfil,
│                        #   centres, reptes, programes, esp
├── esp32/
│   └── TeleROV/         # Firmware del robot (TeleROV.ino)
└── netlify.toml         # Configuració de build i de les funcions
```

## Posada en marxa

### Requisits
- Node.js i npm
- Base de dades MongoDB (p. ex. [MongoDB Atlas](https://www.mongodb.com/atlas))
- [Netlify CLI](https://docs.netlify.com/cli/get-started/), per executar frontend i funcions alhora
- Opcional, per treballar amb el robot: Arduino IDE i una placa ESP32

### 1. Clonar i instal·lar
```bash
git clone https://github.com/ericcasas27/TFG---Programaci-educativa.git
cd TFG---Programaci-educativa/frontend
npm install
```

### 2. Variables d'entorn
Les funcions necessiten aquestes variables (configura-les a Netlify o en un fitxer `.env`):
```
MONGODB_URI=<cadena de connexió de MongoDB>
JWT_SECRET=<clau secreta per signar els tokens JWT>
```

### 3. Executar en local
Des de l'arrel del projecte, amb Netlify CLI (aixeca el frontend i les funcions alhora):
```bash
netlify dev
```

### 4. Firmware del robot
Obre `esp32/TeleROV/TeleROV.ino` amb l'Arduino IDE, selecciona la placa ESP32 i puja'l. Les instruccions de connexió i muntatge (cablejat, motors, alimentació...) es troben dins de la mateixa aplicació, al botó «Instal·lació».

## Desplegament

L'aplicació està desplegada a Netlify: `https://telerov.netlify.app/`

## Autoria

Desenvolupat per **Èric Casas i González** com a Treball de Fi de Grau a la Universitat de Girona (curs `2025–2026`).

Tutoritzat pel Dr. `Jordi Freixenet Bosch` i el Dr. `Xavier Cufí Solé`.

## Llicència

Aquest projecte s'ha desenvolupat com a Treball de Fi de Grau (Universitat de Girona) i no disposa, de moment, d'una llicència de codi obert específica.
