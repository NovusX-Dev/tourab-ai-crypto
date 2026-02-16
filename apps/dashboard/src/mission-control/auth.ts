import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@tourab/shared";
import { randomUUID } from "node:crypto";

export interface AuthenticatedRequest extends Request {
  role: UserRole;
  correlationId: string;
}

export function extractRole(value: string | undefined): UserRole {
  if (value === "operator" || value === "admin" || value === "read_only") {
    return value;
  }
  return "read_only";
}

export function authRoleMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const typed = req as AuthenticatedRequest;
  typed.role = extractRole(req.header("x-tourab-role") ?? undefined);
  typed.correlationId = req.header("x-correlation-id") ?? randomUUID();
  next();
}
