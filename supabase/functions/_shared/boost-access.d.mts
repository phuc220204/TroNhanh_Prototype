export function isBoostTestSeller(testSellerId: string | null | undefined, sellerId: string | null | undefined): boolean;
export function canPayosSellerCheckout(testMode: string | undefined, testSellerId: string | undefined, sellerId: string): boolean;
export function canShowBoostAction(checkoutEnabled: boolean, testMode: string | undefined, testSellerId: string | null | undefined, sellerId: string | null | undefined): boolean;
