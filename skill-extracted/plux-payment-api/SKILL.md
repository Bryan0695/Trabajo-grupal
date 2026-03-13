---
name: plux-payment-api
description: >
  Implementación completa de la API de Pago REST de PLUX S.A. para procesar pagos con tarjeta de crédito/débito. Usa esta skill SIEMPRE que el usuario mencione integrar pagos con PLUX, implementar el botón de pago PLUX, cifrar datos de tarjeta, manejar OTP bancario, 3D-Secure (3DS), pagos recurrentes, o cualquier integración con pagoplux.com. También aplica cuando el usuario pida código para cifrar tarjetas con AES-256-ECB o RSA, estructurar el body de la petición de pago, manejar respuestas de la API, o procesar webhooks de PLUX. Lee siempre los archivos de referencia específicos antes de generar código.
---

# PLUX Payment API — Skill de Implementación

Esta skill cubre la integración completa con la **API de Pago REST de PLUX S.A.** (versión 1.3, noviembre 2024).

---

## Archivos de referencia (leer según el tema pedido)

| Archivo | Cuándo leerlo |
|---|---|
| `references/01-auth-and-keys.md` | Autenticación, claves API, llave pública de cifrado |
| `references/02-encryption.md` | Cifrado AES-256-ECB y RSA de datos de tarjeta |
| `references/03-request-body.md` | Estructura completa del body de la petición |
| `references/04-payment-flows.md` | Flujos: pago normal, recurrente, con/sin OTP |
| `references/05-3ds.md` | Manejo de 3D-Secure (FrictionLess y Desafío) |
| `references/06-responses.md` | Estructura de respuestas, códigos de error |
| `references/07-test-cards.md` | Tarjetas de prueba para Sandbox |

---

## Ambientes

| Ambiente | Base URL |
|---|---|
| **Producción** | `https://api.pagoplux.com/intv1/` |
| **Sandbox** | `https://apipre.pagoplux.com/intv1/` |

---

## Flujo general de integración (resumen)

```
1. Obtener credenciales (id_cliente + clave_secreta) desde Dashboard PLUX
2. Solicitar permiso para llave pública de cifrado
3. Generar llave pública desde Dashboard → opción "Claves de API's" → botón Generar
4. Por cada transacción:
   a. Generar clave simétrica aleatoria de 32 caracteres
   b. Cifrar datos de tarjeta con AES-256-ECB usando la clave simétrica
   c. Cifrar la clave simétrica con RSA usando la llave pública
   d. Enviar petición POST a credentials/paymentCardResource
      - Header Authorization: Basic base64(id_cliente:clave_secreta)
      - Header simetricKey: clave_simétrica_cifrada_RSA
      - Body: datos del comprador, montos, tarjeta cifrada
5. Procesar respuesta:
   - code 0 → Pago exitoso
   - code 100 → Requiere OTP (reenviar con paramsOtp)
   - code 103 → Requiere 3DS (redirigir o mostrar formulario)
   - code 2 → Pago fallido
```

---

## Reglas críticas al generar código

1. **Nunca enviar datos de tarjeta en texto plano** — siempre cifrar con AES-256-ECB primero
2. **La clave simétrica debe ser única por transacción** — generarla aleatoriamente cada vez
3. **La clave simétrica en el header va cifrada con RSA**, pero en el body se usa **sin cifrar** como clave del AES
4. **expirationYear** → solo los 2 últimos dígitos (ej: 2029 → "29")
5. **expirationMonth** → siempre 2 dígitos (ej: julio → "07")
6. **Pagos con tarjeta de débito** → `installments` siempre "0"
7. **`installments` máximo**: "48" (sujeto a autorización bancaria)
8. **`interests`**: "0" = sin intereses, "1" = con intereses; pagos corrientes van en "0"
9. **`idEstablecimiento`**: valor en base64 proporcionado por el administrador PLUX
10. **`baseAmount0`**: monto sin IVA; **`baseAmount12`**: monto con IVA incluido (máx. 2 decimales)
11. **Hora del servidor**: diferencia máxima de 2 minutos con hora mundial

---

## Endpoint principal de pago

```
POST {BASE_URL}credentials/paymentCardResource
Content-Type: application/json
Authorization: Basic {base64(id_cliente:clave_secreta)}
simetricKey: {clave_simetrica_cifrada_RSA_base64}
```

---

## Cuando el usuario pida código, siempre:

1. Leer el archivo de referencia correspondiente
2. Incluir manejo de errores para cada código de respuesta
3. Mostrar ejemplo completo con las 3 fases: cifrado → petición → respuesta
4. Si pide un lenguaje específico, adaptar los ejemplos (la documentación oficial usa Node.js)
5. Recordar al usuario que debe configurar sus credenciales reales antes de usar en producción
