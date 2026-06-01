export interface MtnAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface MtnApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  includeAuth?: boolean;
  referenceId?: string;
}

export interface MtnWebhookAck {
  status: 'success';
}
