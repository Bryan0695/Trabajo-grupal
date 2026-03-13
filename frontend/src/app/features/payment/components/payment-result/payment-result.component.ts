import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PaymentSuccessDetail } from '../../../../core/models/plux.models';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PaymentResultComponent {
  @Input() success = false;
  @Input() detail?: PaymentSuccessDetail;
  @Input() errorMessage?: string;

  @Output() retry = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
