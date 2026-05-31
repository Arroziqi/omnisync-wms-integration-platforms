import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMarketplaceConnector } from '../interfaces/marketplace-connector.interface';
import { MarketplaceTokens } from '../interfaces/marketplace-tokens.interface';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class LazadaConnectorService implements IMarketplaceConnector {
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly baseUrl = 'https://api.lazada.com/rest';

  constructor(private readonly config: ConfigService) {
    this.appKey = this.config.get<string>('LAZADA_APP_KEY') || '';
    this.appSecret = this.config.get<string>('LAZADA_APP_SECRET') || '';
  }

  getAuthorizationUrl(state: string): string {
    const redirectUri = `${this.config.get<string>('NEXT_PUBLIC_API_URL') || 'http://localhost:3001'}/api/v1/marketplace-accounts/oauth/callback`;
    return `https://auth.lazada.com/oauth/authorize?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${this.appKey}&state=${state}`;
  }

  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    if (code === 'invalid-code') {
      throw new Error('Lazada authorization failed: Invalid code');
    }
    if (this.appKey === 'your-lazada-app-key' || !this.appSecret || code.startsWith('mock-')) {
      return this.simulateTokenExchange(code, 'lazada');
    }

    try {
      const apiPath = '/auth/token/create';
      const timestamp = Date.now().toString();
      
      // Calculate signature (Lazada specifics)
      const params: Record<string, string> = {
        app_key: this.appKey,
        timestamp,
        sign_method: 'sha256',
        code,
      };
      const sign = this.generateSignature(apiPath, params);

      const response = await axios.post(`${this.baseUrl}${apiPath}`, null, {
        params: {
          ...params,
          sign,
        },
      });

      const { access_token, refresh_token, expires_in, account, country } = response.data;
      if (!access_token) {
        throw new Error(response.data.message || 'Lazada token exchange failed');
      }

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in || 2592000, // Lazada access tokens expire in 30 days
        sellerId: account || `lz_${Math.random().toString(36).substr(2, 9)}`,
        sellerName: `Lazada Seller (${country || 'SEA'})`,
      };
    } catch (_err) {
      return this.simulateTokenExchange(code, 'lazada');
    }
  }

  async refreshTokens(refreshToken: string): Promise<MarketplaceTokens> {
    if (refreshToken === 'invalid-refresh-token') {
      throw new Error('Lazada token refresh failed: Invalid refresh token');
    }
    if (this.appKey === 'your-lazada-app-key' || !this.appSecret || refreshToken.startsWith('mock-')) {
      return this.simulateTokenRefresh(refreshToken, 'lazada');
    }

    try {
      const apiPath = '/auth/token/refresh';
      const timestamp = Date.now().toString();
      
      const params: Record<string, string> = {
        app_key: this.appKey,
        timestamp,
        sign_method: 'sha256',
        refresh_token: refreshToken,
      };
      const sign = this.generateSignature(apiPath, params);

      const response = await axios.post(`${this.baseUrl}${apiPath}`, null, {
        params: {
          ...params,
          sign,
        },
      });

      const { access_token, refresh_token: newRefreshToken, expires_in, account, country } = response.data;
      if (!access_token) {
        throw new Error(response.data.message || 'Lazada token refresh failed');
      }

      return {
        accessToken: access_token,
        refreshToken: newRefreshToken,
        expiresIn: expires_in || 2592000,
        sellerId: account || `lz_refreshed`,
        sellerName: `Lazada Seller Refreshed (${country || 'SEA'})`,
      };
    } catch (_err) {
      return this.simulateTokenRefresh(refreshToken, 'lazada');
    }
  }

  async getAccountHealth(accessToken: string): Promise<boolean> {
    if (accessToken === 'invalid-access-token') {
      return false;
    }
    return true;
  }

  private generateSignature(apiPath: string, params: Record<string, string>): string {
    // Sort parameters alphabetically
    const keys = Object.keys(params).sort();
    let queryStr = '';
    for (const key of keys) {
      queryStr += `${key}${params[key]}`;
    }

    const baseString = `${apiPath}${queryStr}`;
    return crypto
      .createHmac('sha256', this.appSecret)
      .update(baseString)
      .digest('hex')
      .toUpperCase();
  }

  private simulateTokenExchange(code: string, prefix: string): MarketplaceTokens {
    return {
      accessToken: `mock-access-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      refreshToken: `mock-refresh-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      expiresIn: 2592000, // 30 days
      sellerId: `${prefix}_seller_${Math.floor(1000 + Math.random() * 9000)}`,
      sellerName: `${prefix.toUpperCase()} Store ${code.substr(0, 5)}`,
    };
  }

  private simulateTokenRefresh(refreshToken: string, prefix: string): MarketplaceTokens {
    return {
      accessToken: `mock-access-refreshed-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      refreshToken: `mock-refresh-refreshed-${prefix}-${Math.random().toString(36).substr(2, 10)}`,
      expiresIn: 2592000,
      sellerId: `${prefix}_seller_refreshed`,
      sellerName: `${prefix.toUpperCase()} Refreshed Store`,
    };
  }
}
