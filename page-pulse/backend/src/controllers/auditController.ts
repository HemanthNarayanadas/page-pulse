import { NextFunction, Request, Response } from 'express';
import { validateAuditUrl } from '../validators/urlValidator';
import { runAudit } from '../services/auditService';
import { AuditResponse } from '../types';

export async function postAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedUrl = validateAuditUrl(req.body?.url);
    const { result, cached } = await runAudit(parsedUrl.toString());

    const body: AuditResponse = {
      success: true,
      requestId: req.requestId,
      cached,
      data: result,
    };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}
