'use strict';

const crypto = require('crypto');

function generateSymmetricKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(
    { length: 32 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function encryptAES(plainText, symmetricKey) {
  if (symmetricKey.length !== 32) {
    throw new Error(`Clave simétrica debe ser 32 chars. Recibido: ${symmetricKey.length}`);
  }

  const cipher = crypto.createCipheriv('AES-256-ECB', Buffer.from(symmetricKey), '');
  cipher.setAutoPadding(true);

  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return encrypted;
}

function encryptRSA(symmetricKey, publicKeyPEM) {
  let key = publicKeyPEM.trim().replace(/\\n/g, '\n');

  if (!key.includes('BEGIN PUBLIC KEY')) {
    key = `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
  }

  const encrypted = crypto.publicEncrypt(
    { key, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(symmetricKey)
  );

  return encrypted.toString('base64');
}

function encryptCard(card, symmetricKey) {
  return {
    number:          encryptAES(card.number, symmetricKey),
    expirationYear:  encryptAES(card.expirationYear, symmetricKey),
    expirationMonth: encryptAES(card.expirationMonth, symmetricKey),
    cvv:             encryptAES(card.cvv, symmetricKey),
  };
}

module.exports = {
  generateSymmetricKey,
  encryptAES,
  encryptRSA,
  encryptCard,
};
