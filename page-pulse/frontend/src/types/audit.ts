export interface SecurityHeaders {
  strictTransportSecurity: string | null;
  contentSecurityPolicy: string | null;
  xFrameOptions: string | null;
  xContentTypeOptions: string | null;
  referrerPolicy: string | null;
  permissionsPolicy: string | null;
}

export interface AuditResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  httpsEnabled: boolean;
  title: string | null;
  metaDescription: string | null;
  wordCount: number;
  totalImages: number;
  brokenImages: number;
  internalLinks: number;
  externalLinks: number;
  pageSizeBytes: number;
  contentType: string | null;
  securityHeaders: SecurityHeaders;
  auditedAt: string;
}

export interface AuditResponse {
  success: true;
  requestId: string;
  cached: boolean;
  data: AuditResult;
}

export interface ApiErrorResponse {
  success: false;
  requestId: string;
  error: { code: string; message: string };
}
