# Estructura del Body de la Petición — PLUX

## Endpoint
```
POST {BASE_URL}credentials/paymentCardResource
Content-Type: application/json
```

---

## Esquema completo del body

```json
{
  "card": {
    "number": "string (tarjeta cifrada AES-256-ECB, base64)",
    "expirationYear": "string (año cifrado AES-256-ECB, 2 dígitos, base64)",
    "expirationMonth": "string (mes cifrado AES-256-ECB, 2 dígitos, base64)",
    "cvv": "string (CVV cifrado AES-256-ECB, base64)"
  },
  "buyer": {
    "documentNumber": "string (cédula/RUC sin caracteres especiales)",
    "firstName": "string (nombres del cliente)",
    "lastName": "string (apellidos del cliente)",
    "phone": "string (número celular con código país, ej: +593XXXXXXXXX)",
    "email": "string (correo electrónico)"
  },
  "shippingAddress": {
    "country": "string (país)",
    "city": "string (ciudad)",
    "street": "string (dirección)",
    "number": "string (número de casa/oficina)"
  },
  "currency": "string (ej: 'USD')",
  "baseAmount0": "decimal (monto sin IVA, máx 2 decimales)",
  "baseAmount12": "decimal (monto con IVA incluido, máx 2 decimales)",
  "installments": "string (cuotas: '0'=corriente, máx '48')",
  "interests": "string ('0'=sin intereses, '1'=con intereses)",
  "gracePeriod": "integer (meses de gracia, OPCIONAL)",
  "description": "string (descripción del pago, máx 250 chars)",
  "clientIp": "string (IP del cliente)",
  "idEstablecimiento": "string (ID del establecimiento en base64, proporcionado por PLUX)",

  // SOLO para pagos recurrentes:
  "paramsRecurrent": {
    "permiteCalendarizar": "boolean (true=cobro automático según plan, false=manual)",
    "idPlan": "string (ID o nombre del plan desde Dashboard → Recurrente)"
  },

  // SOLO cuando se responde a una solicitud OTP (code 100):
  "paramsOtp": {
    "idTransaction": "string",
    "sessionId": "string",
    "tkn": "string",
    "tknky": "string",
    "tkniv": "string",
    "otpCode": "string (código OTP ingresado por el tarjetahabiente)"
  },

  // SOLO si el comercio usa 3D-Secure:
  "urlRetorno3ds": "string (URL GET sin auth donde PLUX redirige tras 3DS, OBLIGATORIO si 3DS activo)",
  "urlRetornoExterno": "string (URL para botón 'regresar' en pantalla 3DS, OPCIONAL)"
}
```

---

## Tabla de campos detallada

### Objeto `card`

| Campo | Oblig. | Tipo | Descripción |
|---|---|---|---|
| `number` | Sí | String | Número de tarjeta cifrado con AES-256-ECB (base64) |
| `expirationYear` | Sí | String | Año de vencimiento cifrado — solo 2 últimos dígitos (ej: "29" para 2029) |
| `expirationMonth` | Sí | String | Mes de vencimiento cifrado — 2 dígitos (ej: "04" para abril) |
| `cvv` | Sí | String | Código CVV/CVC cifrado con AES-256-ECB (base64) |

### Objeto `buyer`

| Campo | Oblig. | Tipo | Descripción |
|---|---|---|---|
| `documentNumber` | Sí | String | Cédula o RUC sin caracteres especiales. Validar formato previo. |
| `firstName` | Sí | String | Nombres del cliente |
| `lastName` | Sí | String | Apellidos del cliente |
| `phone` | Sí | String | Teléfono celular (incluir código de país: +593...) |
| `email` | Sí | String | Correo electrónico |

### Objeto `shippingAddress`

| Campo | Oblig. | Tipo | Descripción |
|---|---|---|---|
| `country` | Sí | String | País (ej: "Ecuador") |
| `city` | Sí | String | Ciudad |
| `street` | Sí | String | Dirección/calle |
| `number` | Sí | String | Número de casa o edificio |

### Campos raíz

| Campo | Oblig. | Tipo | Descripción |
|---|---|---|---|
| `currency` | Sí | String | Moneda (ej: "USD") |
| `baseAmount0` | Sí | Decimal | Monto sin IVA (máx 2 decimales). Usar 0.00 si no aplica. |
| `baseAmount12` | Sí | Decimal | Monto con IVA incluido (máx 2 decimales). Usar 0.00 si no aplica. |
| `installments` | Sí | String | Número de cuotas. "0" = pago corriente. Máx "48". Débito siempre "0". |
| `interests` | Sí | String | "0" = sin intereses, "1" = con intereses. Corriente siempre "0". |
| `gracePeriod` | No | Integer | Meses de gracia para financiamiento. Solo si el plan lo tiene. |
| `description` | Sí | String | Descripción del pago (máx 250 caracteres) |
| `clientIp` | Sí | String | IP del cliente (ej: "192.168.1.1") |
| `idEstablecimiento` | Sí | String | ID del establecimiento en base64. Solicitar a administrador PLUX. |
| `urlRetorno3ds` | Cond. | String | Obligatorio si tiene 3DS activo. URL GET sin autenticación donde recibirá `?pti=...&pcc=...&ptk=...` |
| `urlRetornoExterno` | No | String | URL para el botón "regresar" en la pantalla 3DS |

---

## Reglas de montos (baseAmount0 vs baseAmount12)

```
baseAmount0  = total de productos/servicios SIN IVA
baseAmount12 = total de productos/servicios CON IVA (el valor YA incluye el impuesto)
```

**Ejemplo**: Producto de $10 + IVA 15% = $11.50
```json
"baseAmount0": 0.00,
"baseAmount12": 11.50
```

**Ejemplo**: Producto exento de IVA de $10
```json
"baseAmount0": 10.00,
"baseAmount12": 0.00
```

**Ejemplo**: Mezcla ($5 sin IVA + $12 con IVA incluido)
```json
"baseAmount0": 5.00,
"baseAmount12": 12.00
```

### Regla especial para pagos recurrentes con montos mixtos:
El sistema toma `baseAmount0 + baseAmount12` como monto total y lo asigna según el IVA del plan:
- **Si el plan tiene IVA**: `baseAmount12 = 17, baseAmount0 = 0`
- **Si el plan no tiene IVA**: `baseAmount0 = 17, baseAmount12 = 0`

---

## Objeto `paramsRecurrent` (solo pagos recurrentes)

| Campo | Oblig. | Tipo | Descripción |
|---|---|---|---|
| `permiteCalendarizar` | Sí | Boolean | `true` = cobro automático según frecuencia del plan; `false` = cobro bajo demanda |
| `idPlan` | Sí | String | ID o nombre del plan. Verificar en Dashboard → sección Recurrente. |

---

## Objeto `paramsOtp` (solo cuando se recibe code 100)

Se envía una segunda petición al mismo endpoint incluyendo este objeto con los datos
retornados en la respuesta de code 100, más el código OTP ingresado por el usuario.

| Campo | Oblig. | Tipo | Descripción |
|---|---|---|---|
| `idTransaction` | Sí | String | ID de transacción retornado en la respuesta code 100 |
| `sessionId` | Sí | String | Sesión retornada en la respuesta code 100 |
| `tkn` | Sí | String | Token retornado en la respuesta code 100 |
| `tknky` | Sí | String | Token retornado en la respuesta code 100 |
| `tkniv` | Sí | String | Token retornado en la respuesta code 100 |
| `otpCode` | Sí | String | Código OTP que el banco envió al tarjetahabiente por SMS/email |

---

## Ejemplos completos de body

### Pago normal sin OTP
```json
{
  "card": {
    "number": "0TZqWTBbLOzMwimYbmsZES++DAmFcv2qI8sZ6TAGDQ4=",
    "expirationYear": "V4tfZym40aH+63OxqfYkDQ==",
    "expirationMonth": "y4MirSVTxHxp3J2JfSxxZQ==",
    "cvv": "XXCfaHtdkf7z8FmfkJabwQ=="
  },
  "buyer": {
    "documentNumber": "1710020012",
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "+593987654321",
    "email": "juan.perez@email.com"
  },
  "shippingAddress": {
    "country": "Ecuador",
    "city": "Quito",
    "street": "Av. Eloy Alfaro y Río Coca",
    "number": "44-110"
  },
  "currency": "USD",
  "baseAmount0": 0.00,
  "baseAmount12": 12.00,
  "installments": "3",
  "interests": "0",
  "description": "Compra en tienda online",
  "clientIp": "192.168.1.100",
  "idEstablecimiento": "MQ==",
  "urlRetorno3ds": "https://mi-tienda.com/api/pago/confirmar"
}
```

### Segunda petición con OTP (tras recibir code 100)
```json
{
  "card": { "...mismos datos cifrados de la primera petición..." },
  "buyer": { "...mismos datos del comprador..." },
  "shippingAddress": { "...misma dirección..." },
  "currency": "USD",
  "baseAmount0": 0.00,
  "baseAmount12": 12.00,
  "installments": "3",
  "interests": "0",
  "description": "Compra en tienda online",
  "clientIp": "192.168.1.100",
  "idEstablecimiento": "MQ==",
  "paramsOtp": {
    "idTransaction": "Yzc0YjA2ZTAtYTk1NS0xMWVjLTlhNjMtNj",
    "sessionId": "Y2YzZDllYTItMmJkNS00ZDY5LTgzMDYtNTIwOG",
    "tkn": "WVdKbU5UY3dPR1V0TUdGbU5DMDBOekJsTFdKa056SXRZ",
    "tknky": "NDIyNGIyOWZiZmM4OThmMWI4OWRiOWE2MmU0N2I2NGI4ZTY3MTBjYzQ4MmF",
    "tkniv": "MDA3NzY4OGU5OGYwZjE0NjhhMTJhMDRlNGRjZDVlZjYxOWZmMTVlN2Y2",
    "otpCode": "123456"
  }
}
```

### Pago recurrente sin OTP
```json
{
  "card": { "...datos cifrados..." },
  "buyer": { "...datos comprador..." },
  "shippingAddress": { "...dirección..." },
  "paramsRecurrent": {
    "permiteCalendarizar": true,
    "idPlan": "PLAN_MENSUAL"
  },
  "currency": "USD",
  "baseAmount0": 0.00,
  "baseAmount12": 25.00,
  "installments": "0",
  "interests": "0",
  "description": "Suscripción mensual Premium",
  "clientIp": "192.168.1.100",
  "idEstablecimiento": "MQ=="
}
```
