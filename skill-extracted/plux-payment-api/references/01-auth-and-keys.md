# Autenticación y Claves API — PLUX

## Tipos de claves

### 1. Identificador de cliente + Llave secreta
- Juntas forman el header `Authorization` (tipo Basic)
- No requieren permiso especial de PLUX
- Se pueden tener una o varias
- Se crean desde el Dashboard de PLUX → "Claves de API's" → botón "Nuevo"

### 2. Llave pública de cifrado (PEM)
- Trabaja en par con la llave privada que solo tiene PLUX (para descifrar)
- **Requiere permiso explícito de PLUX** (por seguridad, no está disponible para todos)
- Solo se puede tener **una llave pública** activa
- Se genera desde Dashboard → "Claves de API's" → botón "Generar"
- Formato: `-----BEGIN PUBLIC KEY----- ... -----END PUBLIC KEY-----`

---

## Generar el header Authorization

```
Authorization: Basic {base64(id_cliente + ":" + clave_secreta)}
```

**Ejemplo Node.js:**
```javascript
const id_cliente = "AQW9fnd02ShuU0hkkyET5TaNcax";
const clave_secreta = "Dg3lw3lw5dZnpEIzmhPfOk3c2m5kUJaWHHmGVzH5WVp42PG";
const authHeader = "Basic " + Buffer.from(`${id_cliente}:${clave_secreta}`).toString("base64");
```

**Ejemplo Python:**
```python
import base64
id_cliente = "AQW9fnd02ShuU0hkkyET5TaNcax"
clave_secreta = "tu_clave_secreta"
credenciales = f"{id_cliente}:{clave_secreta}"
auth_header = "Basic " + base64.b64encode(credenciales.encode()).decode()
```

**Ejemplo PHP:**
```php
$id_cliente = "AQW9fnd02ShuU0hkkyET5TaNcax";
$clave_secreta = "tu_clave_secreta";
$auth_header = "Basic " . base64_encode("$id_cliente:$clave_secreta");
```

---

## Header simetricKey

Este header lleva la **clave simétrica de 32 caracteres** cifrada con RSA y codificada en base64.

```
simetricKey: {resultado_de_cifrarRSA(clave_simetrica, llave_publica)}
```

- La clave simétrica original (sin cifrar) se usa para cifrar los datos de tarjeta
- La clave simétrica cifrada va en este header
- **Generar una clave simétrica nueva por cada transacción**

---

## Resumen de headers requeridos

| Header | Obligatorio | Valor |
|---|---|---|
| `Authorization` | Sí | `Basic {base64(id_cliente:clave_secreta)}` |
| `simetricKey` | Sí | Clave simétrica de 32 chars cifrada con RSA, en base64 |
| `Content-Type` | Sí | `application/json` |

---

## Acceso al Dashboard

- Si no tienes acceso al Dashboard para crear credenciales, contacta al agente PLUX que te está asistiendo con la integración.
- Si ya tienes una clave secreta de autenticación, no es necesario crear otra.
