# Flujos de Pago — PLUX

## Tipos de pago soportados

| Tipo | Descripción |
|---|---|
| **Normal sin OTP** | Una sola petición, el banco aprueba directamente |
| **Normal con OTP** | Dos peticiones: 1ra genera el OTP, 2da lo valida |
| **Recurrente sin OTP** | Igual al normal pero con `paramsRecurrent` |
| **Recurrente con OTP** | Igual al recurrente pero con ciclo OTP |

---

## Flujo 1: Pago Normal sin OTP

```
Cliente → POST /credentials/paymentCardResource
         (card cifrada + buyer + montos)
       ← Respuesta:
         - code 0: PAGADO ✓
         - code 2: FALLIDO ✗
         - code 100: Requiere OTP → Ir a Flujo 2
         - code 103: Requiere 3DS → Ir a flujo 3DS
```

**Código Node.js completo:**
```javascript
const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://apipre.pagoplux.com/intv1/'; // Sandbox
// const BASE_URL = 'https://api.pagoplux.com/intv1/'; // Producción

const ID_CLIENTE = 'tu_id_cliente';
const CLAVE_SECRETA = 'tu_clave_secreta';
const LLAVE_PUBLICA_PEM = `-----BEGIN PUBLIC KEY-----
{tu_llave_publica_del_dashboard}
-----END PUBLIC KEY-----`;

// Funciones de cifrado (ver references/02-encryption.md)
function generarClaveSimetrica() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: 32}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function cifrarAES_ECB(texto, clave) {
  const cipher = crypto.createCipheriv("AES-256-ECB", Buffer.from(clave), '');
  cipher.setAutoPadding(true);
  let result = cipher.update(Buffer.from(texto), 'utf8', 'base64');
  result += cipher.final('base64');
  return result;
}

function cifrarRSA(texto, publicKeyPEM) {
  let key = publicKeyPEM;
  if (!key.includes('BEGIN PUBLIC KEY')) {
    key = `-----BEGIN PUBLIC KEY-----\n${publicKeyPEM}\n-----END PUBLIC KEY-----`;
  }
  return crypto.publicEncrypt(
    { key, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(texto)
  ).toString('base64');
}

async function procesarPago(datosPago) {
  // 1. Generar clave simétrica única
  const claveSimetrica = generarClaveSimetrica();
  
  // 2. Cifrar datos de tarjeta
  const cardCifrada = {
    number: cifrarAES_ECB(datosPago.numeroTarjeta, claveSimetrica),
    expirationYear: cifrarAES_ECB(datosPago.anioVencimiento, claveSimetrica),
    expirationMonth: cifrarAES_ECB(datosPago.mesVencimiento, claveSimetrica),
    cvv: cifrarAES_ECB(datosPago.cvv, claveSimetrica)
  };
  
  // 3. Cifrar clave simétrica para el header
  const simetricKeyHeader = cifrarRSA(claveSimetrica, LLAVE_PUBLICA_PEM);
  
  // 4. Construir headers
  const authBase64 = Buffer.from(`${ID_CLIENTE}:${CLAVE_SECRETA}`).toString('base64');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${authBase64}`,
    'simetricKey': simetricKeyHeader
  };
  
  // 5. Construir body
  const body = {
    card: cardCifrada,
    buyer: {
      documentNumber: datosPago.documentoCliente,
      firstName: datosPago.nombres,
      lastName: datosPago.apellidos,
      phone: datosPago.telefono,
      email: datosPago.email
    },
    shippingAddress: {
      country: datosPago.pais || 'Ecuador',
      city: datosPago.ciudad,
      street: datosPago.direccion,
      number: datosPago.numeroCasa
    },
    currency: 'USD',
    baseAmount0: datosPago.montoSinIva,
    baseAmount12: datosPago.montoConIva,
    installments: datosPago.cuotas || '0',
    interests: datosPago.intereses || '0',
    description: datosPago.descripcion,
    clientIp: datosPago.clientIp,
    idEstablecimiento: datosPago.idEstablecimiento,
    urlRetorno3ds: datosPago.urlRetorno3ds
  };
  
  // 6. Enviar petición
  const response = await axios.post(
    `${BASE_URL}credentials/paymentCardResource`,
    body,
    { headers }
  );
  
  return response.data;
}

// Uso:
async function main() {
  try {
    const resultado = await procesarPago({
      numeroTarjeta: '4540639936908783',
      anioVencimiento: '29',      // Solo 2 dígitos
      mesVencimiento: '04',       // 2 dígitos
      cvv: '123',
      documentoCliente: '1710020012',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '+593987654321',
      email: 'juan@email.com',
      ciudad: 'Quito',
      direccion: 'Av. Amazonas',
      numeroCasa: '1234',
      montoSinIva: 0.00,
      montoConIva: 11.20,
      cuotas: '0',
      intereses: '0',
      descripcion: 'Compra producto X',
      clientIp: '192.168.1.1',
      idEstablecimiento: 'MQ==',
      urlRetorno3ds: 'https://mi-sitio.com/confirmar-pago'
    });

    if (resultado.code === 0) {
      console.log('✅ Pago exitoso:', resultado.detail.token);
    } else if (resultado.code === 100) {
      console.log('⏳ Requiere OTP - guardar detail para segunda petición');
      // Ver flujo de OTP abajo
    } else if (resultado.code === 103) {
      console.log('🔒 Requiere 3DS - ver references/05-3ds.md');
    } else {
      console.log('❌ Pago fallido:', resultado.description);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

---

## Flujo 2: Pago con OTP

Cuando la respuesta de la primera petición tiene `code: 100`:

```
1ra petición → PLUX responde con code 100 + {idTransaction, sessionId, tkn, tknky, tkniv}
                ↓
              Mostrar campo para que el cliente ingrese el OTP (llega por SMS/email de su banco)
                ↓
2da petición → Misma petición + paramsOtp con los datos de la respuesta + otpCode del cliente
                ↓
              PLUX responde:
              - code 0: PAGADO ✓
              - code 102: OTP incorrecto ✗
              - code 2: Pago fallido ✗
```

**Código Node.js — segunda petición con OTP:**
```javascript
async function validarOTP(datosPago, respuestaOTP, codigoOTP) {
  // datosPago: mismos datos de la primera petición
  // respuestaOTP: el detail de la respuesta con code 100
  // codigoOTP: código ingresado por el cliente

  const claveSimetrica = generarClaveSimetrica(); // Nueva clave por petición
  
  const cardCifrada = {
    number: cifrarAES_ECB(datosPago.numeroTarjeta, claveSimetrica),
    expirationYear: cifrarAES_ECB(datosPago.anioVencimiento, claveSimetrica),
    expirationMonth: cifrarAES_ECB(datosPago.mesVencimiento, claveSimetrica),
    cvv: cifrarAES_ECB(datosPago.cvv, claveSimetrica)
  };
  
  const simetricKeyHeader = cifrarRSA(claveSimetrica, LLAVE_PUBLICA_PEM);
  const authBase64 = Buffer.from(`${ID_CLIENTE}:${CLAVE_SECRETA}`).toString('base64');

  const body = {
    card: cardCifrada,
    buyer: datosPago.buyer,
    shippingAddress: datosPago.shippingAddress,
    currency: 'USD',
    baseAmount0: datosPago.montoSinIva,
    baseAmount12: datosPago.montoConIva,
    installments: datosPago.cuotas,
    interests: datosPago.intereses,
    description: datosPago.descripcion,
    clientIp: datosPago.clientIp,
    idEstablecimiento: datosPago.idEstablecimiento,
    paramsOtp: {
      idTransaction: respuestaOTP.idTransaction,
      sessionId: respuestaOTP.sessionId,
      tkn: respuestaOTP.tkn,
      tknky: respuestaOTP.tknky,
      tkniv: respuestaOTP.tkniv,
      otpCode: codigoOTP
    }
  };
  
  const response = await axios.post(
    `${BASE_URL}credentials/paymentCardResource`,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authBase64}`,
        'simetricKey': simetricKeyHeader
      }
    }
  );
  
  return response.data;
}
```

---

## Flujo 3: Pago Recurrente

Igual que los flujos anteriores pero añadiendo `paramsRecurrent` al body:

```javascript
const bodyRecurrente = {
  ...bodyNormal,
  paramsRecurrent: {
    permiteCalendarizar: true,  // true = PLUX cobra automáticamente según el plan
    idPlan: "PLAN_ID_DESDE_DASHBOARD"
  }
};
```

**Diferencia en la respuesta exitosa de pago recurrente:**
La respuesta incluye `idSuscription` en el `detail`:
```json
{
  "code": 0,
  "detail": {
    "idSuscription": "8ff124e2-a504-4acc-bfa9-6cfc22d52104",
    "...otros campos de pago exitoso..."
  }
}
```

---

## Python: Implementación completa del flujo

```python
import requests
import base64
import random
import string
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5

BASE_URL = 'https://apipre.pagoplux.com/intv1/'  # Sandbox

class PluxPayment:
    def __init__(self, id_cliente, clave_secreta, llave_publica_pem):
        self.id_cliente = id_cliente
        self.clave_secreta = clave_secreta
        self.llave_publica_pem = llave_publica_pem
    
    def _generar_clave_simetrica(self):
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(32))
    
    def _cifrar_aes(self, texto, clave):
        key = clave.encode('utf-8')
        data = texto.encode('utf-8')
        cipher = AES.new(key, AES.MODE_ECB)
        encrypted = cipher.encrypt(pad(data, AES.block_size))
        return base64.b64encode(encrypted).decode('utf-8')
    
    def _cifrar_rsa(self, texto):
        key = RSA.import_key(self.llave_publica_pem)
        cipher = PKCS1_v1_5.new(key)
        encrypted = cipher.encrypt(texto.encode('utf-8'))
        return base64.b64encode(encrypted).decode('utf-8')
    
    def _get_auth_header(self):
        credenciales = f"{self.id_cliente}:{self.clave_secreta}"
        return "Basic " + base64.b64encode(credenciales.encode()).decode()
    
    def procesar_pago(self, datos):
        clave_simetrica = self._generar_clave_simetrica()
        
        card = {
            "number": self._cifrar_aes(datos['numero_tarjeta'], clave_simetrica),
            "expirationYear": self._cifrar_aes(datos['anio'], clave_simetrica),
            "expirationMonth": self._cifrar_aes(datos['mes'], clave_simetrica),
            "cvv": self._cifrar_aes(datos['cvv'], clave_simetrica)
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": self._get_auth_header(),
            "simetricKey": self._cifrar_rsa(clave_simetrica)
        }
        
        body = {
            "card": card,
            "buyer": {
                "documentNumber": datos['cedula'],
                "firstName": datos['nombres'],
                "lastName": datos['apellidos'],
                "phone": datos['telefono'],
                "email": datos['email']
            },
            "shippingAddress": {
                "country": datos.get('pais', 'Ecuador'),
                "city": datos['ciudad'],
                "street": datos['direccion'],
                "number": datos['numero_casa']
            },
            "currency": "USD",
            "baseAmount0": datos['monto_sin_iva'],
            "baseAmount12": datos['monto_con_iva'],
            "installments": datos.get('cuotas', '0'),
            "interests": datos.get('intereses', '0'),
            "description": datos['descripcion'],
            "clientIp": datos['client_ip'],
            "idEstablecimiento": datos['id_establecimiento']
        }
        
        if 'url_retorno_3ds' in datos:
            body['urlRetorno3ds'] = datos['url_retorno_3ds']
        
        if 'params_recurrent' in datos:
            body['paramsRecurrent'] = datos['params_recurrent']
        
        response = requests.post(
            f"{BASE_URL}credentials/paymentCardResource",
            json=body,
            headers=headers
        )
        return response.json()
    
    def validar_otp(self, datos, respuesta_otp, codigo_otp):
        """Segunda petición para validar el OTP"""
        datos['params_otp'] = {
            "idTransaction": respuesta_otp['idTransaction'],
            "sessionId": respuesta_otp['sessionId'],
            "tkn": respuesta_otp['tkn'],
            "tknky": respuesta_otp['tknky'],
            "tkniv": respuesta_otp['tkniv'],
            "otpCode": codigo_otp
        }
        return self.procesar_pago(datos)


# Uso:
plux = PluxPayment(
    id_cliente="tu_id_cliente",
    clave_secreta="tu_clave_secreta",
    llave_publica_pem="""-----BEGIN PUBLIC KEY-----
{tu_llave_publica}
-----END PUBLIC KEY-----"""
)

resultado = plux.procesar_pago({
    'numero_tarjeta': '4540639936908783',
    'anio': '29',
    'mes': '04',
    'cvv': '123',
    'cedula': '1710020012',
    'nombres': 'Juan',
    'apellidos': 'Pérez',
    'telefono': '+593987654321',
    'email': 'juan@email.com',
    'ciudad': 'Quito',
    'direccion': 'Av. Amazonas',
    'numero_casa': '1234',
    'monto_sin_iva': 0.00,
    'monto_con_iva': 11.20,
    'descripcion': 'Compra en tienda',
    'client_ip': '192.168.1.1',
    'id_establecimiento': 'MQ==',
    'url_retorno_3ds': 'https://mi-sitio.com/confirmar'
})

if resultado['code'] == 0:
    print(f"✅ Pago exitoso: {resultado['detail']['token']}")
elif resultado['code'] == 100:
    print("⏳ Ingrese el código OTP enviado por su banco:")
    otp = input()
    resultado_final = plux.validar_otp(datos, resultado['detail'], otp)
elif resultado['code'] == 103:
    print("🔒 Requiere 3DS")
else:
    print(f"❌ Error: {resultado['description']}")
```
