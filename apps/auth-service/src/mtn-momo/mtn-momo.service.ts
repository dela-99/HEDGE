import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { MtnWebhookDto } from './dto/mtn-webhook.dto';
import { MtnAccessTokenResponse, MtnApiRequestOptions, MtnWebhookAck } from './interfaces/mtn-momo.interfaces';

type CachedToken = {
  token: string;
  expiresAt: number;
};

@Injectable()
export class MtnMomoService {
  private readonly logger = new Logger(MtnMomoService.name);
  private cachedToken: CachedToken | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    const tokenResponse = await this.requestToken();
    const refreshBufferSeconds = Math.min(30, Math.max(Math.floor(tokenResponse.expires_in * 0.1), 1));
    this.cachedToken = {
      token: tokenResponse.access_token,
      expiresAt: Date.now() + Math.max(tokenResponse.expires_in - refreshBufferSeconds, 1) * 1000,
    };

    return this.cachedToken.token;
  }

  async request<TResponse>(path: string, options: MtnApiRequestOptions = {}): Promise<TResponse> {
    const headers = await this.buildHeaders(options.includeAuth ?? true, options.headers);
    const requestUrl = new URL(path, this.normalizedBaseUrl());
    const requestInit: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };

    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
      headers.set('Content-Type', 'application/json');
    }

    if (this.requiresReferenceId(requestInit.method)) {
      headers.set('X-Reference-Id', options.referenceId ?? randomUUID());
    }

    const response = await fetch(requestUrl, requestInit);
    return this.handleResponse<TResponse>(response, requestInit.method ?? 'GET', requestUrl);
  }

  acceptWebhook(webhook: MtnWebhookDto): MtnWebhookAck {
    this.logger.debug(`Received MTN MoMo webhook ${webhook.notificationType}:${webhook.transactionId}`);
    return { status: 'success' };
  }

  private async requestToken(): Promise<MtnAccessTokenResponse> {
    const response = await fetch(new URL('/oauth/token', this.normalizedBaseUrl()), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Ocp-Apim-Subscription-Key': this.configService.getOrThrow<string>('mtnMomo.subscriptionKey'),
        'X-Target-Environment': this.configService.getOrThrow<string>('mtnMomo.targetEnvironment'),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.configService.getOrThrow<string>('mtnMomo.apiUser'),
        client_secret: this.configService.getOrThrow<string>('mtnMomo.apiKey'),
      }),
    });

    return this.handleResponse<MtnAccessTokenResponse>(response, 'POST', new URL('/oauth/token', this.normalizedBaseUrl()));
  }

  private async buildHeaders(includeAuth: boolean, extraHeaders?: Record<string, string>) {
    const headers = new Headers(extraHeaders);
    headers.set('Accept', 'application/json');
    headers.set('Ocp-Apim-Subscription-Key', this.configService.getOrThrow<string>('mtnMomo.subscriptionKey'));
    headers.set('X-Target-Environment', this.configService.getOrThrow<string>('mtnMomo.targetEnvironment'));

    if (includeAuth) {
      headers.set('Authorization', `Bearer ${await this.getAccessToken()}`);
    }

    return headers;
  }

  private normalizedBaseUrl() {
    return new URL(this.configService.getOrThrow<string>('mtnMomo.baseUrl'));
  }

  private requiresReferenceId(method: string | undefined) {
    return Boolean(method && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()));
  }

  private async handleResponse<TResponse>(response: Response, method: string, url: URL): Promise<TResponse> {
    const text = await response.text();

    if (!response.ok) {
      throw new HttpException(
        text || `MTN request failed: ${method} ${url.toString()} returned status ${response.status}`,
        response.status,
      );
    }

    return text ? (JSON.parse(text) as TResponse) : (undefined as TResponse);
  }
}
