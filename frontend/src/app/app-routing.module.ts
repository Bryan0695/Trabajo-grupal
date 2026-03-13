import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'pago', pathMatch: 'full' },
  {
    path: 'pago',
    loadChildren: () =>
      import('./features/payment/payment.module').then((m) => m.PaymentModule),
  },
  { path: '**', redirectTo: 'pago' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
