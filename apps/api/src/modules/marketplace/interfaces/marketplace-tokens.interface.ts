export interface MarketplaceTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  sellerId: string;
  sellerName: string;
}
