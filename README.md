# Trabajo Grupal — Integración de Pagos PLUX

Sistema de pago en línea integrado con la API REST de PLUX S.A. (Ecuador), compuesto por un frontend en Angular y un backend en Node.js.

---

## Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Angular | 19 | Framework principal (NgModule, standalone: false) |
| TypeScript | 5.7 | Lenguaje del frontend |
| Tailwind CSS | 3 | Estilos utilitarios |
| RxJS | 7.8 | Manejo de observables y HTTP |
| Angular Router | 19 | Rutas y lazy loading |
| Angular Reactive Forms | 19 | Formularios con validación |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 | Runtime del servidor |
| Express | 4 | Framework HTTP |
| Axios | 1 | Cliente HTTP para llamadas a PLUX |
| crypto (nativo) | — | Cifrado AES-256-ECB y RSA-PKCS1 |
| dotenv | — | Variables de entorno |
| helmet | — | Seguridad HTTP headers |
| cors | — | Control de origen cruzado |
| Jest | — | Tests unitarios |

### API Externa
| Servicio | Entorno | URL |
|---|---|---|
| PLUX Payment API v1 | Sandbox | `https://apipre.pagoplux.com/intv1/` |
| PLUX Payment API v1 | Producción | `https://api.pagoplux.com/intv1/` |

---

## Estructura del proyecto

```
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── payment.controller.js     # Lógica de endpoints + validación
│   │   ├── services/
│   │   │   ├── plux.service.js           # Cliente HTTP de la API PLUX
│   │   │   └── encryption.service.js     # Cifrado AES + RSA
│   │   ├── middleware/
│   │   │   └── validate-ip.middleware.js # Inyección de IP del cliente
│   │   ├── __tests__/                    # Tests unitarios Jest
│   │   └── server.js                     # Entrada Express
│   ├── .env.example                      # Plantilla de variables de entorno
│   └── package.json
│
└── frontend/
    └── src/
        └── app/
            ├── core/
            │   ├── models/plux.models.ts          # Interfaces y enums
            │   └── services/payment.service.ts    # Servicio HTTP Angular
            └── features/payment/
                ├── components/
                │   ├── payment-form/              # Formulario principal
                │   ├── otp-dialog/               # Diálogo de código OTP
                │   └── payment-result/           # Pantalla de resultado
                └── payment.module.ts             # Módulo lazy-loaded
```

---

## Flujos de pago soportados

| Flujo | Descripción |
|---|---|
| **Normal** | Una sola petición → resultado inmediato |
| **OTP** | PLUX envía código al celular → segunda petición con el código |
| **3DS V1** | Redirección vía formulario POST al banco emisor |
| **3DS V2** | Redirección GET al banco emisor + confirmación de retorno |

---

## Seguridad

- Los datos de tarjeta **nunca** viajan en texto plano al backend
- El backend cifra cada campo con **AES-256-ECB** usando una clave simétrica aleatoria de 32 caracteres generada por transacción
- La clave simétrica se cifra con **RSA-PKCS1** usando la llave pública de PLUX y se envía en el header `simetricKey`
- Las credenciales de la API se almacenan exclusivamente en variables de entorno (`.env` excluido del repositorio)

---

## Configuración

Copia `.env.example` a `.env` en la carpeta `backend/` y completa los valores:

```env
PLUX_ID_CLIENTE=tu_id_cliente
PLUX_CLAVE_SECRETA=tu_clave_secreta
PLUX_BASE_URL=https://apipre.pagoplux.com/intv1/
PLUX_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

En `frontend/src/environments/environment.ts` configura:

```ts
pluxEstablishmentId: 'base64_de_tu_id_establecimiento',
```

---

## Ejecución

**Backend**
```bash
cd backend
npm install
node src/server.js
```

**Frontend**
```bash
cd frontend
npm install
node_modules\.bin\ng.cmd serve --port 4200
```

Acceder en: `http://localhost:4200/pago`
