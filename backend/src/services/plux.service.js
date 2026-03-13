'use strict';

const axios  = require('axios');
const { generateSymmetricKey, encryptCard, encryptRSA } = require('./encryption.service');

const PLUX_CODES = {
  SUCCESS:          0,
  GENERIC_ERROR:    1,
  PAYMENT_FAILED:   2,
  OTP_SENT:         100,
  OTP_INVALID:      102,
  REQUIRES_3DS:     103,
  NO_PLANS:         301,
  INVALID_MERCHANT: 302,
  INVALID_PLAN:     303,
  LIMIT_EXCEEDED:   304,
};

class PluxService {
  constructor() {
    this.baseUrl      = process.env.PLUX_BASE_URL;
    this.idCliente    = process.env.PLUX_ID_CLIENTE;
    this.claveSecreta = process.env.PLUX_CLAVE_SECRETA;
    this.publicKeyPEM = process.env.PLUX_PUBLIC_KEY;

    if (!this.baseUrl || !this.idCliente || !this.claveSecreta || !this.publicKeyPEM) {
      throw new Error('Faltan variables de entorno PLUX_*. Revise su .env');
    }
  }

  _getAuthHeader() {
    const credentials = Buffer.from(`${this.idCliente}:${this.claveSecreta}`).toString('base64');
    return `Basic ${credentials}`;
  }

  _buildPayload(request) {
    const symmetricKey = generateSymmetricKey();

    const encryptedCard  = encryptCard(request.card, symmetricKey);
    const simetricKeyB64 = encryptRSA(symmetricKey, this.publicKeyPEM);

    const body = {
      card:             encryptedCard,
      buyer:            request.buyer,
      shippingAddress:  request.shippingAddress,
      currency:         request.currency     || 'USD',
      baseAmount0:      request.baseAmount0  || 0,
      baseAmount12:     request.baseAmount12 || 0,
      installments:     request.installments || '0',
      interests:        request.interests    || '0',
      description:      request.description,
      clientIp:         request.clientIp     || '127.0.0.1',
      idEstablecimiento: request.idEstablecimiento,
    };

    if (request.urlRetorno3ds)     body.urlRetorno3ds     = request.urlRetorno3ds;
    if (request.urlRetornoExterno) body.urlRetornoExterno = request.urlRetornoExterno;
    if (request.paramsRecurrent)   body.paramsRecurrent   = request.paramsRecurrent;
    if (request.paramsOtp)         body.paramsOtp         = request.paramsOtp;
    if (request.gracePeriod)       body.gracePeriod       = request.gracePeriod;

    return { body, simetricKeyB64 };
  }

  async _post(endpoint, body, simetricKeyB64) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this._getAuthHeader(),
    };

    if (simetricKeyB64) {
      headers['simetricKey'] = simetricKeyB64;
    }

    try {
      const response = await axios.post(url, body, { headers, timeout: 30_000 });
      return response.data;
    } catch (err) {
      if (err.response) {
        throw new PluxError(
          err.response.data?.description || 'Error en la API de PLUX',
          err.response.status,
          err.response.data
        );
      }
      if (err.code === 'ECONNABORTED') {
        throw new PluxError('Timeout: PLUX no respondió en 30 segundos', 504);
      }
      throw new PluxError('No se pudo conectar con PLUX', 503);
    }
  }

  async charge(request) {
    const { body, simetricKeyB64 } = this._buildPayload(request);
    return this._post('credentials/paymentCardResource', body, simetricKeyB64);
  }

  async confirm3ds(pti, pcc, ptk) {
    return this._post(
      'integrations/dataTransactionThreeDsResource',
      { pti, pcc, ptk },
      null
    );
  }
}

class PluxError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name       = 'PluxError';
    this.statusCode = statusCode || 500;
    this.data       = data;
  }
}

module.exports = { PluxService, PluxError, PLUX_CODES };
