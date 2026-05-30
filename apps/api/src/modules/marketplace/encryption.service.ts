import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('ENCRYPTION_KEY');
    if (rawKey) {
      // If we have an encryption key configured, ensure it is 32 bytes (256 bits)
      this.key = crypto.createHash('sha256').update(rawKey).digest();
    } else {
      // Fallback: derive a secure 32-byte key from JWT_SECRET or a default fallback
      const fallbackSecret = this.config.get<string>('JWT_SECRET') || 'omnisync-default-secure-key-for-local-dev-fallback';
      this.key = crypto.createHash('sha256').update(fallbackSecret).digest();
    }
  }

  /**
   * Encrypts plain text using AES-256-GCM.
   * Returns a colon-separated string: "iv:encryptedText:authTag"
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  /**
   * Decrypts an encrypted token (format: "iv:encryptedText:authTag") back to plain text.
   */
  decrypt(encryptedText: string): string {
    const [ivHex, encryptedHex, authTagHex] = encryptedText.split(':');
    if (!ivHex || !encryptedHex || !authTagHex) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
