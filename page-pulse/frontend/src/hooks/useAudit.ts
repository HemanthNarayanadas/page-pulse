import { useMutation } from '@tanstack/react-query';
import { auditUrl } from '../services/api';

export function useAudit() {
  return useMutation({
    mutationFn: (url: string) => auditUrl(url),
  });
}
