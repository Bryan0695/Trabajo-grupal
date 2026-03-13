import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService } from '../../../../core/services/payment.service';
import {
  PaymentRequest,
  PaymentState,
  PluxCode,
  OtpDetail,
  ThreeDSDetail,
  PaymentSuccessDetail,
} from '../../../../core/models/plux.models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-payment-form',
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  state: PaymentState = {
    loading: false,
    step: 'form',
  };

  // Datos del request guardados para reusarlos en OTP
  private pendingRequest: PaymentRequest | null = null;
  private destroy$ = new Subject<void>();

  readonly installmentOptions = [
    { value: '0',  label: 'Corriente' },
    { value: '3',  label: '3 meses' },
    { value: '6',  label: '6 meses' },
    { value: '12', label: '12 meses' },
    { value: '24', label: '24 meses' },
  ];

  readonly months = [
    { value: '01', label: '01 - Enero' },
    { value: '02', label: '02 - Febrero' },
    { value: '03', label: '03 - Marzo' },
    { value: '04', label: '04 - Abril' },
    { value: '05', label: '05 - Mayo' },
    { value: '06', label: '06 - Junio' },
    { value: '07', label: '07 - Julio' },
    { value: '08', label: '08 - Agosto' },
    { value: '09', label: '09 - Septiembre' },
    { value: '10', label: '10 - Octubre' },
    { value: '11', label: '11 - Noviembre' },
    { value: '12', label: '12 - Diciembre' },
  ];

  get years(): Array<{ value: string; label: string }> {
    const current = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => {
      const year = current + i;
      const twoDigit = String(year).slice(-2);
      return { value: twoDigit, label: String(year) };
    });
  }

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.handle3dsReturn();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form ────────────────────────────────────────────────────────────────

  private buildForm(): void {
    this.form = this.fb.group({
      // Tarjeta
      cardNumber:      ['', [Validators.required, Validators.pattern(/^\d{13,19}$/)]],
      expirationMonth: ['', Validators.required],
      expirationYear:  ['', Validators.required],
      cvv:             ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],

      // Comprador
      firstName:      ['', [Validators.required, Validators.minLength(2)]],
      lastName:       ['', [Validators.required, Validators.minLength(2)]],
      documentNumber: ['', [Validators.required, Validators.pattern(/^\d{6,13}$/)]],
      phone:          ['', [Validators.required, Validators.pattern(/^\+?\d{9,15}$/)]],
      email:          ['', [Validators.required, Validators.email]],

      // Dirección
      country:       ['Ecuador', Validators.required],
      city:          ['', Validators.required],
      street:        ['', Validators.required],
      addressNumber: ['', Validators.required],

      // Pago
      amount:       [null, [Validators.required, Validators.min(0.01)]],
      installments: ['0', Validators.required],
    });
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    this.pendingRequest = {
      card: {
        number:          v.cardNumber.replace(/\s/g, ''),
        expirationMonth: v.expirationMonth,
        expirationYear:  v.expirationYear,   // Ya es 2 dígitos del selector
        cvv:             v.cvv,
      },
      buyer: {
        documentNumber: v.documentNumber,
        firstName:      v.firstName,
        lastName:       v.lastName,
        phone:          v.phone,
        email:          v.email,
      },
      shippingAddress: {
        country: v.country,
        city:    v.city,
        street:  v.street,
        number:  v.addressNumber,
      },
      currency:         'USD',
      baseAmount0:      0,
      baseAmount12:     Number(v.amount),
      installments:     v.installments,
      interests:        '0',
      description:      `Pago en línea - ${v.firstName} ${v.lastName}`,
      idEstablecimiento: environment.pluxEstablishmentId,
      urlRetorno3ds:    `${environment.appUrl}/pago/confirmar`,
    };

    this.setLoading(true);

    this.paymentService
      .pay(this.pendingRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (res) => this.handlePluxResponse(res),
        error: (err) => this.setError(err.message),
      });
  }

  // ─── OTP ─────────────────────────────────────────────────────────────────

  onOtpSubmit(otpCode: string): void {
    if (!this.pendingRequest || !this.state.otpData) return;

    this.setLoading(true);

    this.paymentService
      .submitOtp(this.pendingRequest, this.state.otpData, otpCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (res) => this.handlePluxResponse(res),
        error: (err) => this.setError(err.message),
      });
  }

  onOtpCancel(): void {
    this.state = { loading: false, step: 'form' };
    this.cdr.markForCheck();
  }

  // ─── 3DS return ──────────────────────────────────────────────────────────

  private handle3dsReturn(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const { pti, pcc, ptk } = params;
        if (pti && pcc && ptk) {
          this.setLoading(true);
          this.paymentService
            .confirm3ds(pti, pcc, ptk)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next:  (res) => this.handlePluxResponse(res),
              error: (err) => this.setError(err.message),
            });
        }
      });
  }

  // ─── Response router ─────────────────────────────────────────────────────

  private handlePluxResponse(res: any): void {
    this.setLoading(false);

    switch (res.code) {
      case PluxCode.SUCCESS:
        this.state = {
          loading: false,
          step: 'result-success',
          successData: res.detail as PaymentSuccessDetail,
        };
        break;

      case PluxCode.OTP_SENT:
        this.state = {
          loading: false,
          step: 'otp',
          otpData: res.detail as OtpDetail,
        };
        break;

      case PluxCode.OTP_INVALID:
        this.state = {
          ...this.state,
          loading: false,
          step: 'otp',
          errorMessage: 'Código OTP incorrecto. Verifique e intente nuevamente.',
        };
        break;

      case PluxCode.REQUIRES_3DS: {
        const detail = res.detail as ThreeDSDetail;
        this.redirect3ds(detail);
        break;
      }

      default:
        this.setError(res.description || 'Pago rechazado. Intente con otro medio de pago.');
    }

    this.cdr.markForCheck();
  }

  // ─── 3DS redirect ────────────────────────────────────────────────────────

  private redirect3ds(detail: ThreeDSDetail): void {
    if (!detail.customFormChallenge) {
      // 3DS V2: redirección directa GET
      window.location.href = detail.url;
    } else {
      // 3DS V1: formulario POST intermedio
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = detail.url;

      (detail.parameters ?? []).forEach((param) => {
        const input = document.createElement('input');
        input.type  = 'hidden';
        input.name  = param.name;
        input.value = param.value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private setLoading(val: boolean): void {
    this.state = { ...this.state, loading: val, errorMessage: undefined };
    this.cdr.markForCheck();
  }

  private setError(message: string): void {
    this.state = { loading: false, step: 'result-error', errorMessage: message };
    this.cdr.markForCheck();
  }

  resetForm(): void {
    this.form.reset({ installments: '0', country: 'Ecuador' });
    this.pendingRequest = null;
    this.state = { loading: false, step: 'form' };
    this.cdr.markForCheck();
  }

  // ─── Template helpers ────────────────────────────────────────────────────

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.hasError(error) && ctrl.touched);
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 19);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    input.value = val;
    this.form.get('cardNumber')?.setValue(val.replace(/\s/g, ''), { emitEvent: false });
  }
}
