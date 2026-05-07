import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@ridendine/db';
import { getStripeClient } from '@ridendine/engine';
import { getDriverActorContext } from '@/lib/engine';

export async function GET() {
  try {
    const ctx = await getDriverActorContext({ requireApproved: false });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    const { data: account } = await supabase
      .from('driver_payout_accounts')
      .select('id, stripe_account_id, status, onboarding_completed_at')
      .eq('driver_id', driver.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ connected: false, status: 'not_started' });
    }

    const stripe = getStripeClient();
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);

    const status = stripeAccount.payouts_enabled
      ? 'active'
      : stripeAccount.details_submitted
      ? 'pending'
      : 'not_started';

    return NextResponse.json({
      connected: true,
      status,
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      stripe_account_id: account.stripe_account_id,
    });
  } catch (error) {
    console.error('Error fetching driver payout account status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout account status' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const ctx = await getDriverActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get driver profile
    const { data: driver } = await supabase
      .from('drivers')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    // Check for existing payout account
    const { data: existingAccount } = await supabase
      .from('driver_payout_accounts')
      .select('stripe_account_id')
      .eq('driver_id', driver.id)
      .single();

    let accountId: string;

    const stripe = getStripeClient();

    if (existingAccount?.stripe_account_id) {
      accountId = existingAccount.stripe_account_id;
    } else {
      // Create Stripe Connect Express account for driver
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: driver.first_name || 'Driver',
          last_name: driver.last_name || '',
          email: user.email,
        },
        business_profile: {
          mcc: '4121', // Taxicabs/limousines (delivery driver)
          name: `${driver.first_name || 'Driver'} ${driver.last_name || ''} - RideNDine`,
        },
      });

      accountId = account.id;

      // Save to database
      await supabase
        .from('driver_payout_accounts')
        .insert({
          driver_id: driver.id,
          stripe_account_id: accountId,
          status: 'pending',
        });
    }

    const driverPublicBase =
      process.env.NEXT_PUBLIC_DRIVER_APP_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (!driverPublicBase) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: set NEXT_PUBLIC_DRIVER_APP_URL for Stripe Connect redirects',
        },
        { status: 500 }
      );
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${driverPublicBase}/profile?refresh=true`,
      return_url: `${driverPublicBase}/profile?payout_setup=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error setting up driver payout account:', error);
    return NextResponse.json(
      { error: 'Failed to setup payout account' },
      { status: 500 }
    );
  }
}
