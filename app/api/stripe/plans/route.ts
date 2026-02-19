import { NextResponse } from 'next/server';
import { getSubscriptionPlans } from '@/lib/stripe/helpers';

export async function GET() {
  try {
    const plans = await getSubscriptionPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
