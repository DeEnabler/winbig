import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('Debug API route hit. Serverless function is running.');
  console.log(
    'Environment vars sample (NEXT_PUBLIC_APP_URL):',
    process.env.NEXT_PUBLIC_APP_URL,
  );
  try {
    console.log('Attempting to return a success response.');
    return NextResponse.json({
      status: 'ok',
      message: 'Debug API route is functioning correctly.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error within debug API route:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      {
        status: 'error',
        message: 'An error occurred within the debug API route.',
        error: errorMessage,
      },
      { status: 500 },
    );
  }
} 