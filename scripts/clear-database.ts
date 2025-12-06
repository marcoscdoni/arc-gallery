/**
 * Clear all NFT data from Supabase database
 * Usage: npx ts-node scripts/clear-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function clearDatabase() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🗑️  Limpando banco de dados Supabase...\n');

  try {
    // Delete in correct order (respecting foreign keys)
    
    console.log('1. Deletando sales...');
    const { error: salesError, count: salesCount } = await supabase
      .from('sales')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (salesError) {
      console.error('❌ Erro ao deletar sales:', salesError);
    } else {
      console.log(`✅ ${salesCount || 0} vendas deletadas`);
    }

    console.log('\n2. Deletando listings...');
    const { error: listingsError, count: listingsCount } = await supabase
      .from('listings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (listingsError) {
      console.error('❌ Erro ao deletar listings:', listingsError);
    } else {
      console.log(`✅ ${listingsCount || 0} listagens deletadas`);
    }

    console.log('\n3. Deletando nfts...');
    const { error: nftsError, count: nftsCount } = await supabase
      .from('nfts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (nftsError) {
      console.error('❌ Erro ao deletar nfts:', nftsError);
    } else {
      console.log(`✅ ${nftsCount || 0} NFTs deletados`);
    }

    console.log('\n✅ Banco de dados limpo com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   - NFTs deletados: ${nftsCount || 0}`);
    console.log(`   - Listings deletadas: ${listingsCount || 0}`);
    console.log(`   - Sales deletadas: ${salesCount || 0}`);
    console.log('\n💡 Agora você pode:');
    console.log('   1. Mintar novos NFTs no contrato atualizado');
    console.log('   2. Listar NFTs no novo marketplace');
    console.log('   3. Iniciar o indexer para sincronizar automaticamente');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

clearDatabase();
