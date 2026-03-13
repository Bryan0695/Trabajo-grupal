# Cifrado de Datos de Tarjeta — PLUX

## Proceso en 2 pasos

```
Paso 1: Cifrar datos de tarjeta con AES-256-ECB (usando clave simétrica)
Paso 2: Cifrar la clave simétrica con RSA (usando llave pública PLUX)
```

---

## Paso 1: Cifrado AES-256-ECB

### Campos que deben cifrarse
| Campo | Ejemplo original | Observación |
|---|---|---|
| `number` | `4540639936908783` | Número completo de tarjeta |
| `cvv` | `123` | Código CVV/CVC |
| `expirationYear` | `29` | Solo 2 últimos dígitos del año |
| `expirationMonth` | `04` | Dos dígitos (abril = "04") |

### Parámetros del cifrado
- Algoritmo: **AES-256-ECB**
- Clave: la clave simétrica de 32 caracteres (generada aleatoriamente)
- Padding: PKCS#7 / PKCS5Padding (auto padding activado)
- Output: **base64**

---

### Implementaciones por lenguaje

#### Node.js (librería nativa `crypto`)
```javascript
const crypto = require('crypto');

/**
 * Genera una clave simétrica aleatoria de 32 caracteres
 */
function generarClaveSimetrica() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let clave = '';
  for (let i = 0; i < 32; i++) {
    clave += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return clave;
}

/**
 * Cifra texto con AES-256-ECB
 * @param {string} texto - Texto a cifrar
 * @param {string} claveSimetrica - Clave de 32 caracteres (sin cifrar)
 * @returns {string} - Texto cifrado en base64
 */
function cifrarAES_ECB(texto, claveSimetrica) {
  const key = Buffer.from(claveSimetrica);
  const src = Buffer.from(texto);
  const cipher = crypto.createCipheriv("AES-256-ECB", key, '');
  cipher.setAutoPadding(true);
  let result = cipher.update(src, 'utf8', 'base64');
  result += cipher.final('base64');
  return result;
}

// Uso:
const claveSimetrica = generarClaveSimetrica(); // "aBcD1234eFgH5678iJkL9012mNoP3456"
const numeroCifrado = cifrarAES_ECB("4540639936908783", claveSimetrica);
const cvvCifrado = cifrarAES_ECB("123", claveSimetrica);
const anioCifrado = cifrarAES_ECB("29", claveSimetrica); // Solo últimos 2 dígitos
const mesCifrado = cifrarAES_ECB("04", claveSimetrica);  // Abril = "04"
```

#### Python
```python
import os
import random
import string
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

def generar_clave_simetrica():
    """Genera clave simétrica aleatoria de 32 caracteres"""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(32))

def cifrar_aes_ecb(texto: str, clave_simetrica: str) -> str:
    """
    Cifra texto con AES-256-ECB
    :param texto: Texto a cifrar
    :param clave_simetrica: Clave de 32 caracteres (sin cifrar)
    :return: Texto cifrado en base64
    """
    key = clave_simetrica.encode('utf-8')
    data = texto.encode('utf-8')
    cipher = AES.new(key, AES.MODE_ECB)
    padded_data = pad(data, AES.block_size)
    encrypted = cipher.encrypt(padded_data)
    return base64.b64encode(encrypted).decode('utf-8')

# Uso:
# pip install pycryptodome
clave_simetrica = generar_clave_simetrica()
numero_cifrado = cifrar_aes_ecb("4540639936908783", clave_simetrica)
cvv_cifrado = cifrar_aes_ecb("123", clave_simetrica)
anio_cifrado = cifrar_aes_ecb("29", clave_simetrica)  # Solo 2 dígitos
mes_cifrado = cifrar_aes_ecb("04", clave_simetrica)
```

#### PHP
```php
function generarClaveSimetrica(): string {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    $clave = '';
    for ($i = 0; $i < 32; $i++) {
        $clave .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $clave;
}

function cifrarAES_ECB(string $texto, string $claveSimetrica): string {
    $encrypted = openssl_encrypt(
        $texto,
        'AES-256-ECB',
        $claveSimetrica,
        OPENSSL_RAW_DATA
    );
    return base64_encode($encrypted);
}

// Uso:
$claveSimetrica = generarClaveSimetrica();
$numeroCifrado = cifrarAES_ECB("4540639936908783", $claveSimetrica);
$cvvCifrado = cifrarAES_ECB("123", $claveSimetrica);
$anioCifrado = cifrarAES_ECB("29", $claveSimetrica);
$mesCifrado = cifrarAES_ECB("04", $claveSimetrica);
```

#### Java
```java
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.security.SecureRandom;

public class PluxCifrado {

    public static String generarClaveSimetrica() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(32);
        for (int i = 0; i < 32; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public static String cifrarAES_ECB(String texto, String claveSimetrica) throws Exception {
        SecretKeySpec keySpec = new SecretKeySpec(claveSimetrica.getBytes("UTF-8"), "AES");
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        byte[] encrypted = cipher.doFinal(texto.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(encrypted);
    }
}
```

---

## Paso 2: Cifrado RSA de la clave simétrica

La clave simétrica (texto plano, 32 chars) se cifra con la llave pública de PLUX.

### Parámetros del cifrado RSA
- Algoritmo: **RSA**
- Padding: **PKCS1** (`RSA_PKCS1_PADDING`)
- Input: clave simétrica en texto plano
- Output: base64

---

### Implementaciones por lenguaje

#### Node.js
```javascript
const crypto = require('crypto');

/**
 * Cifra la clave simétrica con RSA usando la llave pública de PLUX
 * @param {string} claveSimetrica - Clave de 32 chars en texto plano
 * @param {string} publicKey - Llave pública en formato PEM (del Dashboard PLUX)
 * @returns {string} - Clave simétrica cifrada en base64
 */
function cifrarRSA(claveSimetrica, publicKey) {
  let key = publicKey;
  // Agregar encabezados PEM si no los tiene
  if (key.indexOf('BEGIN PUBLIC KEY') < 0) {
    key = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  }
  const encryptedData = crypto.publicEncrypt(
    {
      key: key,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    Buffer.from(claveSimetrica)
  );
  return encryptedData.toString("base64");
}

// Uso:
const llavePública = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

const claveSimetricaCifrada = cifrarRSA(claveSimetrica, llavePública);
// Este valor va en el header: simetricKey
```

#### Python
```python
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
import base64

def cifrar_rsa(clave_simetrica: str, llave_publica_pem: str) -> str:
    """
    Cifra la clave simétrica con RSA-PKCS1
    :param clave_simetrica: 32 caracteres en texto plano
    :param llave_publica_pem: Llave pública en formato PEM del Dashboard PLUX
    :return: Clave simétrica cifrada en base64
    """
    key = RSA.import_key(llave_publica_pem)
    cipher = PKCS1_v1_5.new(key)
    encrypted = cipher.encrypt(clave_simetrica.encode('utf-8'))
    return base64.b64encode(encrypted).decode('utf-8')

# Uso:
llave_publica = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"""

clave_simetrica_cifrada = cifrar_rsa(clave_simetrica, llave_publica)
```

#### PHP
```php
function cifrarRSA(string $claveSimetrica, string $llavePúblicaPEM): string {
    openssl_public_encrypt(
        $claveSimetrica,
        $encrypted,
        $llavePúblicaPEM,
        OPENSSL_PKCS1_PADDING
    );
    return base64_encode($encrypted);
}
```

#### Java
```java
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import javax.crypto.Cipher;
import java.util.Base64;

public static String cifrarRSA(String claveSimetrica, String publicKeyPEM) throws Exception {
    // Limpiar el PEM
    String cleanKey = publicKeyPEM
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replaceAll("\\s", "");
    
    byte[] keyBytes = Base64.getDecoder().decode(cleanKey);
    X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
    KeyFactory kf = KeyFactory.getInstance("RSA");
    PublicKey publicKey = kf.generatePublic(spec);
    
    Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
    cipher.init(Cipher.ENCRYPT_MODE, publicKey);
    byte[] encrypted = cipher.doFinal(claveSimetrica.getBytes("UTF-8"));
    return Base64.getEncoder().encodeToString(encrypted);
}
```

---

## Ejemplo completo del flujo de cifrado (Node.js)

```javascript
const crypto = require('crypto');

// 1. Generar clave simétrica única para esta transacción
const claveSimetrica = generarClaveSimetrica(); // 32 chars aleatorios

// 2. Cifrar datos de tarjeta con AES-256-ECB
const datosTarjetaCifrados = {
  number: cifrarAES_ECB("4540639936908783", claveSimetrica),
  expirationYear: cifrarAES_ECB("29", claveSimetrica),   // Solo 2 dígitos
  expirationMonth: cifrarAES_ECB("04", claveSimetrica),  // 2 dígitos
  cvv: cifrarAES_ECB("123", claveSimetrica)
};

// 3. Cifrar la clave simétrica con RSA (para el header)
const llavePúblicaPEM = `-----BEGIN PUBLIC KEY-----
{pegar_aqui_la_llave_publica_del_dashboard}
-----END PUBLIC KEY-----`;

const simetricKeyHeader = cifrarRSA(claveSimetrica, llavePúblicaPEM);

// 4. Los datos cifrados van en el body, la clave cifrada en el header
console.log("Header simetricKey:", simetricKeyHeader);
console.log("Tarjeta cifrada:", datosTarjetaCifrados);
```

---

## Errores comunes

| Error | Causa | Solución |
|---|---|---|
| Descifrado inválido en PLUX | Clave simétrica tiene más/menos de 32 chars | Verificar longitud exacta = 32 |
| Error padding AES | Modo ECB incorrecto | Usar exactamente AES-256-ECB con PKCS7 padding |
| RSA encryption failed | Formato PEM incorrecto | Incluir los encabezados `-----BEGIN/END PUBLIC KEY-----` |
| Datos de tarjeta rechazados | Año de expiración con 4 dígitos | Enviar solo los 2 últimos dígitos |
| Mes incorrecto | Mes sin cero inicial | Siempre 2 dígitos: "01", "02", ... "12" |
