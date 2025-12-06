/**
 * Check database contents
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkDatabase() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('📊 Verificando dados no Supabase...\n');

  // Check NFTs
  const { data: nfts, error: nftsError } = await supabase
    .from('nfts')
    .select('*', { count: 'exact' });
  
  console.log(`NFTs: ${nfts?.length || 0} registros`);
  if (nftsError) console.error('Erro:', nftsError);
  else if (nfts && nfts.length > 0) {
    console.log('Primeiros 3:', nfts.slice(0, 3).map(n => ({
      id: n.id,
      token_id: n.token_id,
      name: n.name,
      price: n.price
    })));
  }

  // Check Listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*', { count: 'exact' });
  
  console.log(`\nListings: ${listings?.length || 0} registros`);
  if (listingsError) console.error('Erro:', listingsError);

  // Check Sales
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*', { count: 'exact' });
  
  console.log(`\nSales: ${sales?.length || 0} registros`);
  if (salesError) console.error('Erro:', salesError);
}

checkDatabase();
