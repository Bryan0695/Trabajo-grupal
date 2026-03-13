# Tarjetas de Prueba — PLUX Sandbox

> ⚠️ **Estas tarjetas NO son válidas en producción. Solo para Sandbox.**

**Sandbox URL:** `https://apipre.pagoplux.com/intv1/`

Todos los datos: Nombre = "John doe", Expiración = abril/2029, **CVV = 123** (AmEx = 1234)

---

## Tarjetas con respuesta EXITOSA

| Marca | Número | CVV | OTP |
|---|---|---|---|
| VISA | 4540639936908783 | 123 | — |
| AMERICAN EXPRESS | 376651861404404 | 1234 | — |
| MASTERCARD | 5230428590692129 | 123 | — |
| DINERS | 36417200103608 | 123 | 123456 |
| DISCOVER | 6011761603370843 | 123 | 123456 |

---

## Tarjetas con error: Cupo no disponible

| Marca | Número | CVV | OTP |
|---|---|---|---|
| VISA | 4540633357674263 | 123 | — |
| AMERICAN EXPRESS | 376651681114324 | 1234 | — |
| MASTERCARD | 5230426513413979 | 123 | — |
| DINERS | 36707777533427 | 123 | 123456 |
| DISCOVER | 6011635662534327 | 123 | 123456 |

---

## Tarjetas con error: Tarjeta Expirada

| Marca | Número | CVV | OTP |
|---|---|---|---|
| VISA | 4540636579673146 | 123 | — |
| AMERICAN EXPRESS | 376651373069836 | 1234 | — |
| MASTERCARD | 5230422993522090 | 123 | — |
| DINERS | 36899627890729 | 123 | 123456 |
| DISCOVER | 6011584522711685 | 123 | 123456 |

---

## Tarjetas con error: Tarjeta Bloqueada

| Marca | Número | CVV | OTP |
|---|---|---|---|
| VISA | 4540632093612050 | 123 | — |
| AMERICAN EXPRESS | 376651198045250 | 1234 | — |
| MASTERCARD | 5230424748383364 | 123 | — |
| DINERS | 30513704308648 | 123 | 123456 |
| DISCOVER | 6011550021804842 | 123 | 123456 |

---

## Tarjetas con comportamiento alternado (día par = OK, día impar = Error)

| Marca | Número | CVV | OTP |
|---|---|---|---|
| VISA | 4540639405966494 | 123 | — |
| AMERICAN EXPRESS | 376651368448755 | 1234 | — |
| MASTERCARD | 5230424845336083 | 123 | — |
| DINERS | 38164167149624 | 123 | 123456 |
| DISCOVER | 6011994276172051 | 123 | 123456 |

---

## Datos de prueba para el body

```json
{
  "card": {
    "number": "<<cifrar: 4540639936908783>>",
    "expirationYear": "<<cifrar: 29>>",
    "expirationMonth": "<<cifrar: 04>>",
    "cvv": "<<cifrar: 123>>"
  },
  "buyer": {
    "documentNumber": "1710020012",
    "firstName": "John",
    "lastName": "doe",
    "phone": "+593987654321",
    "email": "test@email.com"
  },
  "shippingAddress": {
    "country": "Ecuador",
    "city": "Quito",
    "street": "Av. de Prueba",
    "number": "100"
  },
  "currency": "USD",
  "baseAmount0": 0.00,
  "baseAmount12": 10.00,
  "installments": "0",
  "interests": "0",
  "description": "Pago de prueba Sandbox",
  "clientIp": "127.0.0.1",
  "idEstablecimiento": "MQ=="
}
```

---

## Nota importante sobre la hora

> El sistema valida la hora del servidor donde se ejecuta el pago.
> La diferencia máxima con la hora mundial no debe ser **mayor a 2 minutos**.
> Si el servidor tiene el reloj desincronizado, las transacciones serán rechazadas.

---

## Script de prueba completo (Node.js)

```javascript
const crypto = require('crypto');
const axios = require('axios');

// Configuración Sandbox
const CONFIG = {
  baseUrl: 'https://apipre.pagoplux.com/intv1/',
  idCliente: 'TU_ID_CLIENTE',
  claveSecreta: 'TU_CLAVE_SECRETA',
  llavePublica: `-----BEGIN PUBLIC KEY-----
TU_LLAVE_PUBLICA_AQUI
-----END PUBLIC KEY-----`
};

// Tarjeta de prueba exitosa
const TARJETA_PRUEBA = {
  numero: '4540639936908783',
  anio: '29',
  mes: '04',
  cvv: '123'
};

async function testPago() {
  // Cifrado
  const clave = Array.from({length: 32}, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    [Math.floor(Math.random() * 62)]
  ).join('');
  
  const cifrar = (texto) => {
    const cipher = crypto.createCipheriv("AES-256-ECB", Buffer.from(clave), '');
    cipher.setAutoPadding(true);
    let r = cipher.update(Buffer.from(texto), 'utf8', 'base64');
    r += cipher.final('base64');
    return r;
  };
  
  const simetricKey = crypto.publicEncrypt(
    { key: CONFIG.llavePublica, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(clave)
  ).toString('base64');

  const body = {
    card: {
      number: cifrar(TARJETA_PRUEBA.numero),
      expirationYear: cifrar(TARJETA_PRUEBA.anio),
      expirationMonth: cifrar(TARJETA_PRUEBA.mes),
      cvv: cifrar(TARJETA_PRUEBA.cvv)
    },
    buyer: {
      documentNumber: "1710020012",
      firstName: "John",
      lastName: "doe",
      phone: "+593987654321",
      email: "test@test.com"
    },
    shippingAddress: {
      country: "Ecuador",
      city: "Quito",
      street: "Av. Test",
      number: "100"
    },
    currency: "USD",
    baseAmount0: 0.00,
    baseAmount12: 10.00,
    installments: "0",
    interests: "0",
    description: "Test Sandbox",
    clientIp: "127.0.0.1",
    idEstablecimiento: "MQ=="
  };

  const auth = Buffer.from(`${CONFIG.idCliente}:${CONFIG.claveSecreta}`).toString('base64');

  const resp = await axios.post(
    `${CONFIG.baseUrl}credentials/paymentCardResource`,
    body,
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`, 'simetricKey': simetricKey } }
  );
  
  console.log('Respuesta:', JSON.stringify(resp.data, null, 2));
}

testPago().catch(console.error);
```
