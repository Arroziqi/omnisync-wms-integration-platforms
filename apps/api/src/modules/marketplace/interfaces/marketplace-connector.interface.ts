import { MarketplaceTokens } from './marketplace-tokens.interface';

export interface IMarketplaceConnector {
  /**
   * Generates the authorization URL to redirect the user to.
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchanges the OAuth authorization code for credentials/tokens.
   */
  exchangeCodeForTokens(code: string): Promise<MarketplaceTokens>;

  /**
   * Refreshes the access token using a refresh token.
   */
  refreshTokens(refreshToken: string): Promise<MarketplaceTokens>;

  /**
   * Checks the health/validity of the marketplace connection.
   */
  getAccountHealth(accessToken: string): Promise<boolean>;
}
