'use strict';

const {
  generateSymmetricKey,
  encryptAES,
  encryptCard,
} = require('../services/encryption.service');

describe('EncryptionService', () => {

  describe('generateSymmetricKey', () => {
    it('debe generar una clave de exactamente 32 caracteres', () => {
      const key = generateSymmetricKey();
      expect(key).toHaveLength(32);
    });

    it('debe generar claves distintas en cada llamada', () => {
      const keys = new Set(Array.from({ length: 100 }, () => generateSymmetricKey()));
      expect(keys.size).toBe(100);
    });

    it('solo debe contener caracteres alfanuméricos', () => {
      const key = generateSymmetricKey();
      expect(key).toMatch(/^[A-Za-z0-9]{32}$/);
    });
  });

  describe('encryptAES', () => {
    it('debe retornar una cadena base64 para texto plano válido', () => {
      const key       = generateSymmetricKey();
      const result    = encryptAES('4540639936908783', key);
      const isBase64  = /^[A-Za-z0-9+/]+=*$/.test(result);
      expect(isBase64).toBe(true);
    });

    it('debe producir resultados distintos para distintos textos', () => {
      const key = generateSymmetricKey();
      expect(encryptAES('123', key)).not.toBe(encryptAES('456', key));
    });

    it('debe lanzar error si la clave no tiene 32 chars', () => {
      expect(() => encryptAES('texto', 'clave-corta')).toThrow();
    });
  });

  describe('encryptCard', () => {
    const card = {
      number:          '4540639936908783',
      expirationYear:  '29',
      expirationMonth: '04',
      cvv:             '123',
    };

    it('debe cifrar todos los campos de la tarjeta', () => {
      const key     = generateSymmetricKey();
      const result  = encryptCard(card, key);

      expect(result).toHaveProperty('number');
      expect(result).toHaveProperty('expirationYear');
      expect(result).toHaveProperty('expirationMonth');
      expect(result).toHaveProperty('cvv');
    });

    it('ningún campo cifrado debe ser igual al original', () => {
      const key    = generateSymmetricKey();
      const result = encryptCard(card, key);

      expect(result.number).not.toBe(card.number);
      expect(result.cvv).not.toBe(card.cvv);
      expect(result.expirationYear).not.toBe(card.expirationYear);
    });
  });
});
