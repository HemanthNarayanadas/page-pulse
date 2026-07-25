import axios, { AxiosError } from 'axios';
import { AuditResponse, ApiErrorResponse } from '../types/audit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export class ApiRequestError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiRequestError';
  }
}

export async function auditUrl(url: string): Promise<AuditResponse> {
  try {
    const res = await apiClient.post<AuditResponse>('/api/audit', { url });
    return res.data;
  } catch (err) {
    const axiosErr = err as AxiosError<ApiErrorResponse>;
    if (axiosErr.response?.data?.error) {
      throw new ApiRequestError(axiosErr.response.data.error.code, axiosErr.response.data.error.message);
    }
    throw new ApiRequestError('NETWORK_ERROR', 'Could not reach the Page Pulse API. Is the backend running?');
  }
}
