import { Module } from '@nestjs/common';
import { PaymentGatewayAdapter } from './http/payment-gateway.adapter.js';
import { PAYMENT_GATEWAY_ADAPTER } from './payment-gateway.port.js';

@Module({
  providers: [{ provide: PAYMENT_GATEWAY_ADAPTER, useClass: PaymentGatewayAdapter }],
  exports: [PAYMENT_GATEWAY_ADAPTER],
})
export class PaymentGatewayModule {}
