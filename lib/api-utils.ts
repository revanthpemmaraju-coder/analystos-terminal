import { NextResponse } from 'next/server';

export function sanitizeString(input: string): string {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}

export function validateSymbol(symbol: string): boolean {
  if (!symbol) return false;
  return /^[A-Za-z0-9\-\.]+$/.test(symbol);
}

export function errorResponse(message: string, status: number = 400): NextResponse {
  // Never expose internal errors directly; map common status codes if needed
  const msg = status >= 500 ? 'Internal Server Error' : message;
  return NextResponse.json({ error: msg }, { status });
}

export function jsonResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}
