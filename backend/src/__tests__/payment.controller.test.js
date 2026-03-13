'use strict';

// Mock del PluxService antes de requerir el controller
jest.mock('../services/plux.service', () => {
  const mockCharge     = jest.fn();
  const mockConfirm3ds = jest.fn();

  return {
    PluxService: jest.fn().mockImplementation(() => ({
      charge:     mockCharge,
      confirm3ds: mockConfirm3ds,
    })),
    PluxError: class PluxError extends Error {
      constructor(message, statusCode, data) {
        super(message);
        this.statusCode = statusCode;
        this.data       = data;
      }
    },
    PLUX_CODES: {
      SUCCESS:       0,
      PAYMENT_FAILED: 2,
      OTP_SENT:      100,
      OTP_INVALID:   102,
      REQUIRES_3DS:  103,
    },
  };
});

const { charge, confirm3ds } = require('../controllers/payment.controller');
const { PluxService }        = require('../services/plux.service');

const mockPlux = new PluxService();

// Helper: crea objetos req/res de Express mock
const mockReq = (body = {}) => ({ body });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

// Payload válido mínimo
const validRequest = {
  card: {
    number:          '4540639936908783',
    expirationYear:  '29',
    expirationMonth: '04',
    cvv:             '123',
  },
  buyer: {
    documentNumber: '1710020012',
    firstName:      'Juan',
    lastName:       'Pérez',
    email:          'juan@test.com',
    phone:          '+593987654321',
  },
  shippingAddress: {
    country: 'Ecuador',
    city:    'Quito',
    street:  'Av. Test',
    number:  '100',
  },
  baseAmount0:      0,
  baseAmount12:     10.00,
  installments:    '0',
  interests:       '0',
  description:     'Test',
  idEstablecimiento: 'MQ==',
};

describe('PaymentController', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── charge ──────────────────────────────────────────────────────────────

  describe('POST /api/payments/charge', () => {
    it('retorna 400 si faltan campos obligatorios', async () => {
      const req = mockReq({});
      const res = mockRes();
      await charge(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 si expirationYear tiene más de 2 dígitos', async () => {
      const req = mockReq({ ...validRequest, card: { ...validRequest.card, expirationYear: '2029' } });
      const res = mockRes();
      await charge(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 con code 0 en pago exitoso', async () => {
      mockPlux.charge.mockResolvedValue({
        code: 0,
        description: 'Transacción procesada correctamente.',
        detail: { token: '001234', amount: 10 },
        status: 'Success',
      });

      const req = mockReq(validRequest);
      const res = mockRes();
      await charge(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
    });

    it('retorna 200 con code 100 cuando se requiere OTP', async () => {
      mockPlux.charge.mockResolvedValue({
        code: 100,
        description: 'OTP enviado',
        detail: { idTransaction: 'abc', sessionId: 'xyz', tkn: 't', tknky: 'k', tkniv: 'i' },
        status: 'Success',
      });

      const req = mockReq(validRequest);
      const res = mockRes();
      await charge(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 100 })
      );
    });
  });

  // ── confirm3ds ───────────────────────────────────────────────────────────

  describe('POST /api/payments/3ds-confirm', () => {
    it('retorna 400 si faltan pti, pcc, ptk', async () => {
      const req = mockReq({ pti: 'abc' });
      const res = mockRes();
      await confirm3ds(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 con el resultado de PLUX si los params son válidos', async () => {
      mockPlux.confirm3ds.mockResolvedValue({
        code: 0,
        description: 'Transacción procesada',
        detail: { token: '009999' },
        status: 'Success',
      });

      const req = mockReq({ pti: 'p1', pcc: 'p2', ptk: 'p3' });
      const res = mockRes();
      await confirm3ds(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
