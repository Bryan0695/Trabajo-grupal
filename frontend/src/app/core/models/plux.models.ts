// ─── Card & Payment DTOs ────────────────────────────────────────────────────

export interface CardData {
  number: string;
  expirationYear: string;   // Solo 2 dígitos: "29"
  expirationMonth: string;  // 2 dígitos: "04"
  cvv: string;
}

export interface BuyerData {
  documentNumber: string;
  firstName: string;
  lastName: string;
  phone: string;   // Formato: +593XXXXXXXXX
  email: string;
}

export interface ShippingAddress {
  country: string;
  city: string;
  street: string;
  number: string;
}

export interface ParamsRecurrent {
  permiteCalendarizar: boolean;
  idPlan: string;
}

export interface ParamsOtp {
  idTransaction: string;
  sessionId: string;
  tkn: string;
  tknky: string;
  tkniv: string;
  otpCode: string;
}

// ─── Request ────────────────────────────────────────────────────────────────

export interface PaymentRequest {
  card: CardData;
  buyer: BuyerData;
  shippingAddress: ShippingAddress;
  currency: string;
  baseAmount0: number;
  baseAmount12: number;
  installments: string;
  interests: string;
  description: string;
  clientIp?: string;
  idEstablecimiento: string;
  urlRetorno3ds?: string;
  urlRetornoExterno?: string;
  paramsRecurrent?: ParamsRecurrent;
  paramsOtp?: ParamsOtp;
}

// ─── Response detail variants ────────────────────────────────────────────────

export interface PaymentSuccessDetail {
  id_transaccion: string;
  token: string;
  amount: number;
  cardType: 'credit' | 'debit';
  cardIssuer: string;
  cardInfo: string;
  clientID: string;
  clientName: string;
  state: string;
  fecha: string;
  acquirer: string;
  deferred: number;
  interests: string;
  interestValue: number;
  amountWoTaxes: string;
  amountWTaxes: string;
  taxesValue: string;
  amountAuthorized?: number;
  idSuscription?: string;   // Solo pagos recurrentes
}

export interface OtpDetail {
  idTransaction: string;
  sessionId: string;
  tkn: string;
  tknky: string;
  tkniv: string;
}

export interface ThreeDSDetail {
  url: string;
  idTransaction: string;
  customFormChallenge: boolean;
  parameters?: Array<{ name: string; value: string }>;
}

// ─── Generic response ────────────────────────────────────────────────────────

export interface PluxResponse {
  code: PluxCode;
  description: string;
  detail: PaymentSuccessDetail | OtpDetail | ThreeDSDetail | string;
  status: string;
}

export enum PluxCode {
  SUCCESS          = 0,
  GENERIC_ERROR    = 1,
  PAYMENT_FAILED   = 2,
  OTP_SENT         = 100,
  OTP_INVALID      = 102,
  REQUIRES_3DS     = 103,
  NO_PLANS         = 301,
  INVALID_MERCHANT = 302,
  INVALID_PLAN     = 303,
  LIMIT_EXCEEDED   = 304,
}

// ─── UI Models ───────────────────────────────────────────────────────────────

export interface PaymentFormValue {
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  street: string;
  addressNumber: string;
  amount: number;
  installments: string;
}

export interface PaymentState {
  loading: boolean;
  step: 'form' | 'otp' | 'result-success' | 'result-error' | '3ds';
  otpData?: OtpDetail;
  successData?: PaymentSuccessDetail;
  errorMessage?: string;
  threeDsData?: ThreeDSDetail;
}
