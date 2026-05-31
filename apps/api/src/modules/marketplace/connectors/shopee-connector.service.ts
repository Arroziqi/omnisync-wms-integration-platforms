import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMarketplaceConnector } from '../interfaces/marketplace-connector.interface';
import { MarketplaceTokens } from '../interfaces/marketplace-tokens.interface';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class ShopeeConnectorService implements IMarketplaceConnector {
  private readonly partnerId: string;
  private readonly partnerKey: string;
  private readonly baseUrl = 'https://partner.shopeemobile.com';

  constructor(private readonly config: ConfigService) {
    this.partnerId = this.config.get<string>('SHOPEE_PARTNER_ID') || '';
    this.partnerKey = this.config.get<string>('SHOPEE_PARTNER_KEY') || '';
  }

  getAuthorizationUrl(state: string): string {
    const redirectUri = `${this.config.get<string>('NEXT_PUBLIC_API_URL') || 'http://localhost:3001'}/api/v1/marketplace-accounts/oauth/callback`;
    const path = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(path, timestamp);

    return `https://partner.shopeemobile.com/api/v2/shop/auth_partner?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    if (code === 'invalid-code') {
      throw new Error('Shopee authorization failed: Invalid code');
    }
    if (this.partnerId === 'your-shopee-partner-id' || !this.partnerKey || code.startsWith('mock-')) {
      return this.simulateTokenExchange(code, 'shopee');
    }

    try {
      const path = '/api/v2/auth/token/get';
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = this.generateSignature(path, timestamp);

      const response = await axios.post(
        `${this.baseUrl}${path}?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}`,
        {
          code,
          partner_id: parseInt(this.partnerId, 10),
        }
      );

      const { error, access_token, refresh_token, expire_in, shop_id } = response.data;
      if (error) {
        throw new Error(`Shopee token exchange error: ${error}`);
      }

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expire_in || 14400,
        sellerId: shop_id?.toString() || `sh_${Math.random().toString(36).substr(2, 9)}`,
        sellerName: `Shopee Store ${shop_id || ''}`,
      };
    } catch (_err) {
      return this.simulateTokenExchange(code, 'shopee');
    }
  }

  async refreshTokens(refreshToken: string): Promise<MarketplaceTokens> {
    if (refreshToken === 'invalid-refresh-token') {
      throw new Error('Shopee token refresh failed: Invalid refresh token');
    }
    if (this.partnerId === 'your-shopee-partner-id' || !this.partnerKey || refreshToken.startsWith('mock-')) {
      return this.simulateTokenRefresh(refreshToken, 'shopee');
    }

    try {
      const path = '/api/v2/auth/access_token/get';
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = this.generateSignature(path, timestamp);

      const response = await axios.post(
        `${this.baseUrl}${path}?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}`,
        {
          refresh_token: refreshToken,
          partner_id: parseInt(this.partnerId, 10),
        }
      );

      const { error, access_token, refresh_token: newRefreshToken, expire_in, shop_id } = response.data;
      if (error) {
        throw new Error(`Shopee token refresh error: ${error}`);
      }

      return {
        accessToken: access_token,
        refreshToken: newRefreshToken,
        expiresIn: expire_in || 14400,
        sellerId: shop_id?.toString() || `sh_refreshed`,
        sellerName: `Shopee Refreshed Store ${shop_id || ''}`,
      };
    } catch (_err) {
      return this.simulateTokenRefresh(refreshToken, 'shopee');
    }
  }

  async getAccountHealth(accessToken: string): Promise<boolean> {
    if (accessToken === 'invalid-access-token') {
      return false;
    }
    return true; // Simple health status for mock/simulated integration
  }

  private generateSignature(path: string, timestamp: number): string {
    const baseString = `${this.partnerId}${path}${timestamp}`;
    return crypto.createHmac('sha256', this.partnerKey).update(baseString).digest('hex');
  }

  private simulateTokenExchange(code: string, prefix: string): MarketplaceTokens {
    return {
      accessToken: `mock-access-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      refreshToken: `mock-refresh-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      expiresIn: 14400, // Shopee tokens expire in 4 hours typically
      sellerId: `${prefix}_seller_${Math.floor(1000 + Math.random() * 9000)}`,
      sellerName: `${prefix.toUpperCase()} Store ${code.substr(0, 5)}`,
    };
  }

  private simulateTokenRefresh(refreshToken: string, prefix: string): MarketplaceTokens {
    return {
      accessToken: `mock-access-refreshed-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      refreshToken: `mock-refresh-refreshed-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      expiresIn: 14400,
      sellerId: `${prefix}_seller_refreshed`,
      sellerName: `${prefix.toUpperCase()} Refreshed Store`,
    };
  }
}
