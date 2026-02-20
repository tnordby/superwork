import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';

export async function GET() {
  try {
    // Fetch all products
    const products = await stripe.products.list({
      limit: 100,
      active: true,
      expand: ['data.default_price'],
    });

    // Fetch all prices for each product
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          prices: prices.data.map(price => ({
            id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval,
            intervalCount: price.recurring?.interval_count,
            active: price.active,
          })),
        };
      })
    );

    return NextResponse.json({
      products: productsWithPrices,
      total: products.data.length,
    });
  } catch (error) {
    console.error('Error fetching Stripe products:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
