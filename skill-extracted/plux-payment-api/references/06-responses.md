# Respuestas y Códigos de Error — PLUX

## Estructura general de respuesta

```json
{
  "code": 0,              // Código de respuesta
  "description": "...",   // Descripción del resultado
  "detail": { ... },      // Detalle (varía según el code)
  "status": "Success"     // "Success", "Failed", "succeded"
}
```

---

## Códigos de respuesta

| Código | Significado | Acción recomendada |
|---|---|---|
| `0` | Pago exitoso | Actualizar estado de orden como PAGADO |
| `1` | Error genérico (credenciales u otro) | Revisar credenciales; ver `description` |
| `2` | Pago fallido (rechazo del banco) | Mostrar error al usuario; ver `description` |
| `100` | OTP generado y enviado al tarjetahabiente | Solicitar código OTP al usuario; hacer 2da petición |
| `102` | Código OTP incorrecto | Informar al usuario; permitir reintentar |
| `103` | Transacción pendiente validación 3DS | Redirigir al flujo 3DS |
| `301` | El establecimiento no tiene planes registrados | Verificar configuración de planes en Dashboard |
| `302` | El establecimiento no existe | Verificar `idEstablecimiento` |
| `303` | Datos incorrectos para consulta del plan | Verificar `idPlan` en `paramsRecurrent` |
| `304` | Límites de monto o cantidad superados | El banco adquiriente define los límites del comercio |

---

## Respuesta: Pago Exitoso (code 0)

### Pago normal exitoso
```json
{
  "code": 0,
  "description": "Transacción procesada correctamente.",
  "detail": {
    "id_transaccion": "9c3698d0-a959-11ec-8ac2-c1ccd8e22a8b",
    "token": "003369-220321-063050",
    "amount": 22,
    "cardType": "credit",
    "cardIssuer": "VISA",
    "cardInfo": "3641 72XX XX 36 08",
    "clientID": "1003088679",
    "clientName": "Juan Pérez",
    "state": "PAGADO",
    "fecha": "2022-03-21 15:59:40",
    "acquirer": "GUAYAQUIL",
    "deferred": 0,
    "interests": "NO",
    "interestValue": 0,
    "amountWoTaxes": "10.00",
    "amountWTaxes": "10.71",
    "taxesValue": "1.29"
  },
  "status": "Success"
}
```

### Campos del detail en pago exitoso

| Campo | Tipo | Descripción |
|---|---|---|
| `id_transaccion` | String | UUID único de la transacción en PLUX |
| `token` | String | Token del comprobante de pago |
| `amount` | Number | Monto total cobrado |
| `cardType` | String | Tipo de tarjeta: "credit" o "debit" |
| `cardIssuer` | String | Marca de la tarjeta: VISA, MASTERCARD, etc. |
| `cardInfo` | String | Número de tarjeta enmascarado |
| `clientID` | String | Documento del cliente |
| `clientName` | String | Nombre del cliente |
| `state` | String | Estado: "PAGADO" |
| `fecha` | String | Fecha y hora de la transacción |
| `acquirer` | String | Banco adquiriente |
| `deferred` | Number | Cuotas diferidas |
| `interests` | String | "SI" o "NO" |
| `interestValue` | Number | Valor de los intereses |
| `amountWoTaxes` | String | Monto sin impuestos |
| `amountWTaxes` | String | Monto con impuestos |
| `taxesValue` | String | Valor del impuesto |
| `amountAuthorized` | Number | Monto autorizado (solo en respuesta 3DS) |

### Pago recurrente exitoso (incluye `idSuscription`)
```json
{
  "code": 0,
  "description": "Transacción procesada correctamente.",
  "detail": {
    "id_transaccion": "a1783bab-822e-43b3-a8b5-f979d2ac2f7d",
    "token": "002487-211118-000075",
    "amount": 12.22,
    "cardType": "credit",
    "cardIssuer": "VISA",
    "cardInfo": "4540 63XX XXXX 0031",
    "clientID": "123331222",
    "clientName": "Juan Pérez",
    "state": "PAGADO",
    "fecha": "2021-11-18 11:45:00",
    "acquirer": "GUAYAQUIL",
    "deferred": 0,
    "interests": "NO",
    "interestValue": 0,
    "amountWoTaxes": 0,
    "amountWTaxes": "10.91",
    "taxesValue": "1.31",
    "idSuscription": "8ff124e2-a504-4acc-bfa9-6cfc22d52104"
  },
  "status": "Success"
}
```

---

## Respuesta: Pago Fallido (code 2)

```json
{
  "code": 2,
  "description": "Failed",
  "detail": "No se puede realizar el pago, la transacción ya fue procesada",
  "status": "Failed"
}
```

El campo `detail` puede variar según el motivo de rechazo del banco.

---

## Respuesta: OTP Generado (code 100)

```json
{
  "code": 100,
  "description": "Código OTP enviado correctamente por SMS o email del tarjeta habiente.",
  "detail": {
    "idTransaction": "Yzc0YjA2ZTAtYTk1NS0xMWVjLTlhNjMtNj",
    "sessionId": "Y2YzZDllYTItMmJkNS00ZDY5LTgzMDYtNTIwOG",
    "tkn": "WVdKbU5UY3dPR1V0TUdGbU5DMDBOekJsTFdKa056SXRZ",
    "tknky": "NDIyNGIyOWZiZmM4OThmMWI4OWRiOWE2MmU0N2I2NGI4ZTY3MTBjYzQ4MmF",
    "tkniv": "MDA3NzY4OGU5OGYwZjE0NjhhMTJhMDRlNGRjZDVlZjYxOWZmMTVlN2Y2"
  },
  "status": "Success"
}
```

Guardar todos los campos del `detail` para enviarlos en la segunda petición dentro de `paramsOtp`.

---

## Respuesta: OTP Incorrecto (code 102)

```json
{
  "code": 102,
  "description": "OTP incorrecto",
  "detail": "OTP incorrecto",
  "status": "failed"
}
```

---

## Respuesta: Requiere 3DS (code 103)

### 3DS V2 (customFormChallenge = false)
```json
{
  "code": 103,
  "description": "Validación 3ds necesaria",
  "detail": {
    "url": "https://url-banco.com/challenge",
    "idTransaction": "Y2E1MzA3MjAtMjk5Yy0xMWVlLTgyMTQtOGJkMTc4OGYzYTU1",
    "customFormChallenge": false
  },
  "status": "succeded"
}
```

### 3DS V1 (customFormChallenge = true)
```json
{
  "code": 103,
  "description": "Validación 3ds necesaria",
  "detail": {
    "url": "https://url-banco.com/challenge",
    "idTransaction": "Y2E1MzA3MjAtMjk5Yy0xMWVlLTgyMTQtOGJkMTc4OGYzYTU1",
    "customFormChallenge": true,
    "parameters": [
      {"name": "threeDSSessionData", "value": ""},
      {"name": "creq", "value": "G00Y2ZjLTg4YTgtY2FhMjkzYTkxNGUz..."}
    ]
  },
  "status": "succeded"
}
```

---

## Handler completo de respuestas (Node.js)

```javascript
function procesarRespuestaPlux(respuesta, contexto) {
  switch (respuesta.code) {
    case 0:
      return {
        exito: true,
        token: respuesta.detail.token,
        idTransaccion: respuesta.detail.id_transaccion,
        monto: respuesta.detail.amount,
        tarjeta: respuesta.detail.cardInfo,
        mensaje: 'Pago procesado correctamente'
      };
    
    case 100:
      return {
        exito: false,
        requiereOTP: true,
        datosOTP: respuesta.detail,
        mensaje: 'Se ha enviado un código OTP al tarjetahabiente'
      };
    
    case 102:
      return {
        exito: false,
        requiereOTP: true,
        otpIncorrecto: true,
        mensaje: 'Código OTP incorrecto. Por favor verifique e intente nuevamente.'
      };
    
    case 103:
      return {
        exito: false,
        requiere3DS: true,
        url3DS: respuesta.detail.url,
        idTransaction: respuesta.detail.idTransaction,
        esV1: respuesta.detail.customFormChallenge,
        parametros3DS: respuesta.detail.parameters || [],
        mensaje: 'Se requiere verificación adicional del banco'
      };
    
    case 301:
      return {
        exito: false,
        error: 'CONFIG_ERROR',
        mensaje: 'El establecimiento no tiene planes configurados. Contactar administrador PLUX.'
      };
    
    case 302:
      return {
        exito: false,
        error: 'CONFIG_ERROR',
        mensaje: 'Establecimiento no encontrado. Verificar idEstablecimiento.'
      };
    
    case 303:
      return {
        exito: false,
        error: 'CONFIG_ERROR',
        mensaje: 'Plan no encontrado. Verificar idPlan en paramsRecurrent.'
      };
    
    case 304:
      return {
        exito: false,
        error: 'LIMIT_ERROR',
        mensaje: 'Límite de transacciones superado. Intente más tarde.'
      };
    
    case 2:
    default:
      return {
        exito: false,
        error: 'PAYMENT_FAILED',
        mensajeBanco: respuesta.detail,
        mensaje: respuesta.description || 'Pago rechazado por el banco'
      };
  }
}
```

---

## Handler completo de respuestas (Python)

```python
def procesar_respuesta_plux(respuesta: dict) -> dict:
    code = respuesta.get('code')
    
    if code == 0:
        return {
            'exito': True,
            'token': respuesta['detail']['token'],
            'id_transaccion': respuesta['detail']['id_transaccion'],
            'monto': respuesta['detail']['amount'],
            'estado': respuesta['detail']['state'],
            'id_suscripcion': respuesta['detail'].get('idSuscription')  # Solo recurrente
        }
    
    elif code == 100:
        return {
            'exito': False,
            'requiere_otp': True,
            'datos_otp': respuesta['detail']
        }
    
    elif code == 102:
        return {
            'exito': False,
            'otp_incorrecto': True,
            'mensaje': 'Código OTP incorrecto'
        }
    
    elif code == 103:
        detail = respuesta['detail']
        return {
            'exito': False,
            'requiere_3ds': True,
            'url_3ds': detail['url'],
            'id_transaction': detail['idTransaction'],
            'es_v1': detail.get('customFormChallenge', False),
            'parametros': detail.get('parameters', [])
        }
    
    else:
        return {
            'exito': False,
            'codigo_error': code,
            'mensaje': respuesta.get('description', 'Error desconocido'),
            'detalle': respuesta.get('detail', '')
        }
```
