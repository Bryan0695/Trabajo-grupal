'use strict';

const { PluxService, PluxError, PLUX_CODES } = require('../services/plux.service');

const plux = new PluxService();

async function charge(req, res) {
  const request = req.body;

  const validationError = validatePaymentRequest(request);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const pluxResponse = await plux.charge(request);
    return res.status(200).json(mapPluxResponse(pluxResponse));
  } catch (err) {
    return handleError(err, res);
  }
}

async function confirm3ds(req, res) {
  const { pti, pcc, ptk } = req.body;

  if (!pti || !pcc || !ptk) {
    return res.status(400).json({ message: 'Parámetros 3DS incompletos (pti, pcc, ptk)' });
  }

  try {
    const pluxResponse = await plux.confirm3ds(pti, pcc, ptk);
    return res.status(200).json(mapPluxResponse(pluxResponse));
  } catch (err) {
    return handleError(err, res);
  }
}

function validatePaymentRequest(req) {
  if (!req?.card?.number)          return 'Número de tarjeta requerido';
  if (!req?.card?.expirationYear)  return 'Año de expiración requerido';
  if (!req?.card?.expirationMonth) return 'Mes de expiración requerido';
  if (!req?.card?.cvv)             return 'CVV requerido';

  if (!/^\d{2}$/.test(req.card.expirationYear)) {
    return 'expirationYear debe ser exactamente 2 dígitos numéricos (ej: "29")';
  }

  if (!/^(0[1-9]|1[0-2])$/.test(req.card.expirationMonth)) {
    return 'expirationMonth inválido. Use 2 dígitos: "01" a "12"';
  }

  if (!/^\d{3,4}$/.test(req.card.cvv)) {
    return 'CVV inválido (3 o 4 dígitos)';
  }

  if (!req?.buyer?.firstName)                        return 'Nombre del comprador requerido';
  if (!req?.buyer?.lastName)                         return 'Apellido del comprador requerido';
  if (!req?.buyer?.documentNumber)                   return 'Documento del comprador requerido';
  if (!/^\d{6,13}$/.test(req.buyer.documentNumber)) return 'Documento inválido (solo dígitos, 6-13 caracteres)';
  if (!req?.buyer?.email)                            return 'Email requerido';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.buyer.email)) return 'Email inválido';
  if (!req?.buyer?.phone)                            return 'Teléfono requerido';
  if (!/^\+?\d{9,15}$/.test(req.buyer.phone))       return 'Teléfono inválido (incluir código de país, ej: +593987654321)';

  if (!req?.shippingAddress?.country) return 'País de envío requerido';
  if (!req?.shippingAddress?.city)    return 'Ciudad de envío requerida';
  if (!req?.shippingAddress?.street)  return 'Calle/dirección de envío requerida';
  if (!req?.shippingAddress?.number)  return 'Número de dirección requerido';

  const amt0  = Number(req.baseAmount0)  || 0;
  const amt12 = Number(req.baseAmount12) || 0;
  if (amt0 < 0 || amt12 < 0)              return 'Los montos no pueden ser negativos';
  if (amt0 + amt12 === 0)                  return 'El monto total debe ser mayor a $0.00';
  if (amt0 > 99999.99 || amt12 > 99999.99) return 'Monto fuera del límite permitido';

  const installments = Number(req.installments);
  if (isNaN(installments) || installments < 0 || installments > 48) {
    return 'installments inválido (valor entre 0 y 48)';
  }

  if (!['0', '1'].includes(String(req.interests))) {
    return 'interests inválido ("0" sin intereses, "1" con intereses)';
  }

  if (!req?.description)            return 'Descripción del pago requerida';
  if (req.description.length > 250) return `Descripción demasiado larga (${req.description.length} chars, máximo 250)`;
  if (!req?.idEstablecimiento)      return 'ID de establecimiento requerido';

  if (req.paramsOtp) {
    const otp = req.paramsOtp;
    for (const field of ['idTransaction', 'sessionId', 'tkn', 'tknky', 'tkniv', 'otpCode']) {
      if (!otp[field]) return `paramsOtp.${field} es requerido`;
    }
    if (!/^\d{4,8}$/.test(otp.otpCode)) return 'otpCode inválido (4-8 dígitos numéricos)';
  }

  if (req.paramsRecurrent) {
    if (typeof req.paramsRecurrent.permiteCalendarizar !== 'boolean') {
      return 'paramsRecurrent.permiteCalendarizar debe ser boolean';
    }
    if (!req.paramsRecurrent.idPlan) return 'paramsRecurrent.idPlan es requerido';
  }

  return null;
}

function mapPluxResponse(pluxRes) {
  const base = {
    code:        pluxRes.code,
    description: pluxRes.description,
    status:      pluxRes.status,
    detail:      pluxRes.detail,
  };

  switch (pluxRes.code) {
    case PLUX_CODES.SUCCESS:
      return { ...base, message: 'Pago procesado correctamente' };
    case PLUX_CODES.OTP_SENT:
      return { ...base, message: 'Código OTP enviado al tarjetahabiente' };
    case PLUX_CODES.OTP_INVALID:
      return { ...base, message: 'Código OTP incorrecto. Verifique e intente nuevamente.' };
    case PLUX_CODES.REQUIRES_3DS:
      return { ...base, message: 'Se requiere validación 3D-Secure del banco emisor' };
    case PLUX_CODES.NO_PLANS:
      return { ...base, message: 'El establecimiento no tiene planes configurados. Contacte a PLUX.' };
    case PLUX_CODES.INVALID_MERCHANT:
      return { ...base, message: 'Establecimiento no encontrado. Verifique idEstablecimiento.' };
    case PLUX_CODES.INVALID_PLAN:
      return { ...base, message: 'Plan no encontrado. Verifique idPlan en paramsRecurrent.' };
    case PLUX_CODES.LIMIT_EXCEEDED:
      return { ...base, message: 'Límite de monto o cantidad superado. Intente más tarde.' };
    case PLUX_CODES.GENERIC_ERROR:
      return { ...base, message: pluxRes.description || 'Error de credenciales o configuración.' };
    case PLUX_CODES.PAYMENT_FAILED:
    default:
      return { ...base, message: pluxRes.description || 'Pago rechazado por el banco emisor.' };
  }
}

function handleError(err, res) {
  console.error('[PluxController] Error:', err.message, err.data ?? '');

  if (err instanceof PluxError) {
    return res.status(err.statusCode).json({ message: err.message, detail: err.data });
  }

  return res.status(500).json({ message: 'Error interno del servidor' });
}

module.exports = { charge, confirm3ds };
