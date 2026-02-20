import { NextResponse } from 'next/server';
import { resend } from '@/lib/email/config';

export async function GET() {
  try {
    // Try to list domains to see what's verified
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      domains: data,
      note: 'Look for domains with status: verified',
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check Resend domains',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
