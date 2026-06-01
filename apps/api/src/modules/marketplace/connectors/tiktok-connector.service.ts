import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMarketplaceConnector } from '../interfaces/marketplace-connector.interface';
import { MarketplaceTokens } from '../interfaces/marketplace-tokens.interface';
import axios from 'axios';

@Injectable()
export class TikTokConnectorService implements IMarketplaceConnector {
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly baseUrl = 'https://open-api.tiktokglobalshop.com';

  constructor(private readonly config: ConfigService) {
    this.appKey = this.config.get<string>('TIKTOK_APP_KEY') || '';
    this.appSecret = this.config.get<string>('TIKTOK_APP_SECRET') || '';
  }

  getAuthorizationUrl(state: string): string {
    const redirectUri = encodeURIComponent(
      `${this.config.get<string>('NEXT_PUBLIC_API_URL') || 'http://localhost:3001'}/api/v1/marketplace-accounts/oauth/callback`
    );
    return `https://services.tiktokshop.com/open/authorize?app_key=${this.appKey}&state=${state}&redirect_uri=${redirectUri}`;
  }

  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    if (!this.appKey || !this.appSecret) {
      throw new Error('TikTok app credentials are not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/token/get`, {
        params: {
          app_key: this.appKey,
          app_secret: this.appSecret,
          auth_code: code,
          grant_type: 'authorized_code',
        },
      });

      const { data } = response.data;
      if (!data || !data.access_token) {
        throw new Error(response.data.message || 'Failed to exchange token');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.access_token_expire_in || 86400,
        sellerId: data.seller_id || `tt_${Math.random().toString(36).substr(2, 9)}`,
        sellerName: data.seller_name || 'TikTok Seller Partner',
      };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to exchange token with TikTok');
    }
  }

  async refreshTokens(refreshToken: string): Promise<MarketplaceTokens> {
    if (!this.appKey || !this.appSecret) {
      throw new Error('TikTok app credentials are not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/token/refresh`, {
        params: {
          app_key: this.appKey,
          app_secret: this.appSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
      });

      const { data } = response.data;
      if (!data || !data.access_token) {
        throw new Error(response.data.message || 'Failed to refresh token');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.access_token_expire_in || 86400,
        sellerId: data.seller_id || `tt_refreshed`,
        sellerName: data.seller_name || 'TikTok Seller Refreshed',
      };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to refresh token with TikTok');
    }
  }

  async getAccountHealth(accessToken: string): Promise<boolean> {
    if (!this.appKey || !this.appSecret) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/shop/active_shops`, {
        params: {
          app_key: this.appKey,
          access_token: accessToken,
        },
      });
      return response.data.code === 0;
    } catch {
      return false;
    }
  }


}
