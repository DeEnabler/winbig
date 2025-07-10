import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log(`Middleware invoked for URL: ${request.url}`);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers));

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
}; 