import type { NextFunction, Request, Response } from "express";

interface Hit {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 10_000;
const MAX_REQUESTS = 15;
const hits = new Map<string, Hit>();

export function controlRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const current = hits.get(key);
  if (!current || now > current.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  current.count += 1;
  hits.set(key, current);
  if (current.count > MAX_REQUESTS) {
    res.status(429).json({
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many control requests; retry shortly."
    });
    return;
  }

  next();
}
