import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  PaymentRequest,
  PluxResponse,
  PluxCode,
  OtpDetail,
  ThreeDSDetail,
  PaymentSuccessDetail,
} from '../models/plux.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) {}

  /**
   * Primera petición de pago.
   * El backend se encarga del cifrado AES + RSA y de llamar a PLUX.
   */
  pay(request: PaymentRequest): Observable<PluxResponse> {
    return this.http
      .post<PluxResponse>(`${this.api}/charge`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Segunda petición cuando PLUX respondió con code 100 (OTP requerido).
   * Se envía el mismo request original + paramsOtp con el código ingresado por el usuario.
   */
  submitOtp(
    originalRequest: PaymentRequest,
    otpDetail: OtpDetail,
    otpCode: string
  ): Observable<PluxResponse> {
    const requestWithOtp: PaymentRequest = {
      ...originalRequest,
      paramsOtp: {
        idTransaction: otpDetail.idTransaction,
        sessionId:     otpDetail.sessionId,
        tkn:           otpDetail.tkn,
        tknky:         otpDetail.tknky,
        tkniv:         otpDetail.tkniv,
        otpCode,
      },
    };
    return this.http
      .post<PluxResponse>(`${this.api}/charge`, requestWithOtp)
      .pipe(catchError(this.handleError));
  }

  /**
   * Confirmación final tras el redirect de 3DS.
   * El backend llama a PLUX con los params pti, pcc, ptk.
   */
  confirm3ds(pti: string, pcc: string, ptk: string): Observable<PluxResponse> {
    return this.http
      .post<PluxResponse>(`${this.api}/3ds-confirm`, { pti, pcc, ptk })
      .pipe(catchError(this.handleError));
  }

  // ── Type guards ──────────────────────────────────────────────────────────

  isSuccess(res: PluxResponse): res is PluxResponse & { detail: PaymentSuccessDetail } {
    return res.code === PluxCode.SUCCESS;
  }

  isOtp(res: PluxResponse): res is PluxResponse & { detail: OtpDetail } {
    return res.code === PluxCode.OTP_SENT;
  }

  is3ds(res: PluxResponse): res is PluxResponse & { detail: ThreeDSDetail } {
    return res.code === PluxCode.REQUIRES_3DS;
  }

  // ── Error handling ───────────────────────────────────────────────────────

  private handleError(err: HttpErrorResponse): Observable<never> {
    let message = 'Error inesperado. Intente nuevamente.';

    if (err.error?.message) {
      message = err.error.message;
    } else if (err.status === 0) {
      message = 'Sin conexión al servidor. Verifique su red.';
    } else if (err.status === 401) {
      message = 'No autorizado. Contacte al administrador.';
    } else if (err.status === 503) {
      message = 'Servicio de pagos no disponible. Intente más tarde.';
    }

    return throwError(() => new Error(message));
  }
}
