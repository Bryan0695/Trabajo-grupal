import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { PaymentFormComponent } from './components/payment-form/payment-form.component';
import { OtpDialogComponent } from './components/otp-dialog/otp-dialog.component';
import { PaymentResultComponent } from './components/payment-result/payment-result.component';

const routes: Routes = [
  { path: '',         component: PaymentFormComponent },
  { path: 'confirmar', component: PaymentFormComponent }, // 3DS return URL
];

@NgModule({
  declarations: [
    PaymentFormComponent,
    OtpDialogComponent,
    PaymentResultComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class PaymentModule {}
