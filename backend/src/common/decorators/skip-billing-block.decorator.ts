import { SetMetadata } from '@nestjs/common';

export const SKIP_BILLING_BLOCK_KEY = 'skipBillingBlock';
export const SkipBillingBlock = () => SetMetadata(SKIP_BILLING_BLOCK_KEY, true);
