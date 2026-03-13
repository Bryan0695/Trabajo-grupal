import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-otp-dialog',
  templateUrl: './otp-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OtpDialogComponent implements OnInit, OnDestroy {
  @Input() errorMessage?: string;
  @Input() loading = false;

  @Output() otpSubmitted = new EventEmitter<string>();
  @Output() cancelled    = new EventEmitter<void>();

  otpControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^\d{4,8}$/),
  ]);

  // Countdown para reenvío (60s)
  countdown = 60;
  canResend = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private startCountdown(): void {
    this.countdown = 60;
    this.canResend = false;
    clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.timer);
        this.canResend = true;
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  onSubmit(): void {
    if (this.otpControl.invalid) {
      this.otpControl.markAsTouched();
      return;
    }
    this.otpSubmitted.emit(this.otpControl.value!.trim());
  }

  onResend(): void {
    // Emitir "submit sin OTP" para que el padre re-llame la 1ra petición
    this.otpControl.reset();
    this.startCountdown();
    this.cancelled.emit(); // El padre vuelve a enviar la petición inicial
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  get hasFormatError(): boolean {
    return !!(this.otpControl.hasError('pattern') && this.otpControl.touched);
  }
}
