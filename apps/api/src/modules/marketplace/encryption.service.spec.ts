import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let _configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return 'test-key-32-characters-long-123456';
              if (key === 'JWT_SECRET') return 'test-jwt-secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt correctly', () => {
    const plainText = 'super-secret-token-123';
    const encrypted = service.encrypt(plainText);
    
    expect(encrypted).toBeDefined();
    expect(encrypted.split(':').length).toBe(3); // iv:ciphertext:tag

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should fail decryption if payload is corrupted/modified', () => {
    const plainText = 'some-secret';
    const encrypted = service.encrypt(plainText);
    
    // Corrupt the ciphertext part
    const [iv, ciphertext, tag] = encrypted.split(':');
    const corrupted = `${iv}:${ciphertext.substring(0, ciphertext.length - 2) + '00'}:${tag}`;

    expect(() => service.decrypt(corrupted)).toThrow();
  });

  it('should fallback to JWT_SECRET key derivation when ENCRYPTION_KEY is not configured', async () => {
    // Setup another testing module where ENCRYPTION_KEY is null
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return null;
              if (key === 'JWT_SECRET') return 'my-fallback-jwt-secret-key-derivation';
              return null;
            }),
          },
        },
      ],
    }).compile();

    const fallbackService = module.get<EncryptionService>(EncryptionService);
    const plainText = 'my-token';
    const encrypted = fallbackService.encrypt(plainText);
    const decrypted = fallbackService.decrypt(encrypted);
    
    expect(decrypted).toBe(plainText);
  });
});
