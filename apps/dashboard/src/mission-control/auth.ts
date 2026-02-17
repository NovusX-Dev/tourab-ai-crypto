import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@tourab/shared";
import { createHmac, randomUUID } from "node:crypto";

export interface AuthenticatedRequest extends Request {
  role: UserRole;
  correlationId: string;
  userId: string;
  authMode: "header" | "signed";
}

export interface SignedAuthClaims {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createSignedAccessToken(claims: SignedAuthClaims, secret: string): string {
  const payload = base64UrlEncode(JSON.stringify(claims));
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export function verifySignedAccessToken(token: string, secret: string): SignedAuthClaims | undefined {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) {
    return undefined;
  }
  const expected = signPayload(payload, secret);
  if (sig !== expected) {
    return undefined;
  }
  let claims: SignedAuthClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payload)) as SignedAuthClaims;
  } catch {
    return undefined;
  }
  if (!claims || typeof claims !== "object") {
    return undefined;
  }
  if (!(claims.role === "read_only" || claims.role === "operator" || claims.role === "admin")) {
    return undefined;
  }
  if (!claims.sub || typeof claims.sub !== "string") {
    return undefined;
  }
  if (!Number.isFinite(claims.exp) || Date.now() >= claims.exp * 1000) {
    return undefined;
  }
  return claims;
}

export function extractRole(value: string | undefined): UserRole {
  if (value === "operator" || value === "admin" || value === "read_only") {
    return value;
  }
  return "read_only";
}

function bearerFromHeader(headerValue: string | undefined): string | undefined {
  if (!headerValue) {
    return undefined;
  }
  const trimmed = headerValue.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) {
    return undefined;
  }
  return trimmed.slice(7).trim() || undefined;
}

export function authRoleMiddleware(req: Request, res: Response, next: NextFunction): void {
  const typed = req as AuthenticatedRequest;
  typed.correlationId = req.header("x-correlation-id") ?? randomUUID();

  const requireSigned = process.env.TOURAB_REQUIRE_SIGNED_AUTH === "1";
  const secret = process.env.TOURAB_AUTH_SECRET;
  const bearer = bearerFromHeader(req.header("authorization") ?? undefined);

  if (bearer && secret) {
    const claims = verifySignedAccessToken(bearer, secret);
    if (claims) {
      typed.role = claims.role;
      typed.userId = claims.sub;
      typed.authMode = "signed";
      next();
      return;
    }
  }

  if (requireSigned) {
    res.status(401).json({
      ok: false,
      code: "AUTH_INVALID",
      message: "Signed auth token is required and must be valid.",
      correlationId: typed.correlationId
    });
    return;
  }

  typed.role = extractRole(req.header("x-tourab-role") ?? undefined);
  typed.userId = req.header("x-user-id") ?? "anonymous";
  typed.authMode = "header";
  next();
}
