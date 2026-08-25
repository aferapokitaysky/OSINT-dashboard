import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-correlation-id');
  const correlationId = incoming?.trim() || randomUUID();
  (req as RequestWithCorrelationId).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}
