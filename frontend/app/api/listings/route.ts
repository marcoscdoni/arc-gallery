import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nft_id, token_id, nft_contract, seller, price } = body;

    // Validate required fields
    if (!nft_id || token_id === undefined || !nft_contract || !seller || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if NFT exists
    const { data: nft, error: nftError } = await supabase
      .from('nfts')
      .select('id')
      .eq('id', nft_id)
      .single();

    if (nftError || !nft) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    // Deactivate any existing active listings for this NFT
    await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('nft_contract', nft_contract.toLowerCase())
      .eq('token_id', Number(token_id))
      .eq('is_active', true);

    // Create new listing with temporary listing_id (negative timestamp)
    // The indexer will update it later with the actual on-chain listing ID
    const tempListingId = -Date.now(); // Negative timestamp ensures uniqueness and won't conflict with real listing IDs
    
    const { data, error } = await supabase
      .from('listings')
      .insert({
        listing_id: tempListingId,
        nft_id,
        token_id: Number(token_id),
        nft_contract: nft_contract.toLowerCase(),
        seller_address: seller.toLowerCase(),
        price: price.toString(),
        token_address: nft_contract.toLowerCase(), // Using NFT contract as token address
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      return NextResponse.json(
        { error: 'Failed to create listing', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, listing: data });
  } catch (error) {
    console.error('Listing creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cancel listing
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nft_contract = searchParams.get('nft_contract');
    const token_id = searchParams.get('token_id');

    if (!nft_contract || !token_id) {
      return NextResponse.json(
        { error: 'Missing nft_contract or token_id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('nft_contract', nft_contract.toLowerCase())
      .eq('token_id', Number(token_id));

    if (error) {
      console.error('Error cancelling listing:', error);
      return NextResponse.json(
        { error: 'Failed to cancel listing' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Listing cancellation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
