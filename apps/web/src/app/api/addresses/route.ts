import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { customerAddressesTable, createServerClient, getAddressesByCustomer, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@ridendine/db';
import { createCustomerAddressSchema, updateCustomerAddressSchema } from '@ridendine/validation';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';
import { geocodeAddress, buildAddressString } from '@ridendine/engine';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const addresses = await getAddressesByCustomer(supabase, customer.id);

    return NextResponse.json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validated = createCustomerAddressSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    // Geocode address if lat/lng not provided
    let lat = validated.lat ?? null;
    let lng = validated.lng ?? null;

    if (lat === null || lng === null) {
      const addressString = buildAddressString({
        streetAddress: validated.addressLine1,
        city: validated.city,
        state: validated.state,
        postalCode: validated.postalCode,
        country: validated.country || 'CA',
      });
      const coords = await geocodeAddress(addressString);
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      }
    }

    const address = await createAddress(supabase, {
      customer_id: customer.id,
      label: validated.label,
      address_line1: validated.addressLine1,
      address_line2: validated.addressLine2 ?? null,
      city: validated.city,
      state: validated.state,
      postal_code: validated.postalCode,
      country: validated.country || 'CA',
      lat,
      lng,
      delivery_instructions: validated.deliveryInstructions || null,
      is_default: validated.isDefault || false,
    });

    if (validated.isDefault) {
      await setDefaultAddress(supabase, customer.id, address.id);
    }

    return NextResponse.json({
      success: true,
      data: address,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const validated = updateCustomerAddressSchema.parse(body);
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address id is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);
    const { data: existingAddress } = await customerAddressesTable(supabase)
      .select('id')
      .eq('id', addressId)
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (validated.label !== undefined) updates.label = validated.label;
    if (validated.addressLine1 !== undefined) updates.address_line1 = validated.addressLine1;
    if (validated.addressLine2 !== undefined) updates.address_line2 = validated.addressLine2;
    if (validated.city !== undefined) updates.city = validated.city;
    if (validated.state !== undefined) updates.state = validated.state;
    if (validated.postalCode !== undefined) updates.postal_code = validated.postalCode;
    if (validated.country !== undefined) updates.country = validated.country;
    if (validated.lat !== undefined) updates.lat = validated.lat;
    if (validated.lng !== undefined) updates.lng = validated.lng;
    if (validated.deliveryInstructions !== undefined) updates.delivery_instructions = validated.deliveryInstructions;
    if (validated.isDefault !== undefined) updates.is_default = validated.isDefault;

    // Re-geocode if address fields changed and no explicit lat/lng provided
    const addressFieldsChanged =
      validated.addressLine1 !== undefined ||
      validated.city !== undefined ||
      validated.state !== undefined ||
      validated.postalCode !== undefined;

    if (addressFieldsChanged && validated.lat === undefined && validated.lng === undefined) {
      const { data: current } = await customerAddressesTable(supabase)
        .select('address_line1, city, state, postal_code, country')
        .eq('id', addressId)
        .single();

      if (current) {
        const addressString = buildAddressString({
          streetAddress: updates.address_line1 ?? current.address_line1,
          city: updates.city ?? current.city,
          state: updates.state ?? current.state,
          postalCode: updates.postal_code ?? current.postal_code,
          country: updates.country ?? current.country,
        });
        const coords = await geocodeAddress(addressString);
        if (coords) {
          updates.lat = coords.latitude;
          updates.lng = coords.longitude;
        }
      }
    }

    const updatedAddress = await updateAddress(supabase, addressId, updates);

    if (validated.isDefault) {
      await setDefaultAddress(supabase, customer.id, addressId);
    }

    return NextResponse.json({
      success: true,
      data: updatedAddress,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address id is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);
    const { data: existingAddress } = await customerAddressesTable(supabase)
      .select('id')
      .eq('id', addressId)
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    await deleteAddress(supabase, addressId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
