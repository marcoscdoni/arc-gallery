// Quick test script to verify Pinata API token
// Run with: node test-nft-storage.js

async function testPinata() {
  const token = process.env.NEXT_PUBLIC_PINATA_JWT;
  
  if (!token) {
    console.error('❌ NEXT_PUBLIC_PINATA_JWT not found in environment');
    console.log('Make sure you have .env.local file with your API token');
    process.exit(1);
  }

  console.log('🔑 Token found:', token.substring(0, 30) + '...');
  console.log('🧪 Testing Pinata connection...\n');

  try {
    // Create a simple test blob
    const testData = 'Hello from ArcNFT marketplace!';
    const testBlob = new Blob([testData], { type: 'text/plain' });
    
    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', testBlob, 'test.txt');
    
    console.log('📤 Uploading test file to IPFS via Pinata...');
    
    const response = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const cid = result.data.cid;
    
    console.log('\n✅ SUCCESS! Pinata API is working!');
    console.log('📦 File uploaded to IPFS');
    console.log('🔗 IPFS Hash:', cid);
    console.log('🌐 Gateway URL:', `https://gateway.pinata.cloud/ipfs/${cid}`);
    console.log('\n✨ You can now create NFTs with image uploads!');
    console.log('💾 Free tier: 1GB storage + 100k requests/month');
    
  } catch (error) {
    console.error('\n❌ ERROR: Pinata test failed');
    console.error('Error message:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n🔐 Your API token appears to be invalid');
      console.error('Please check:');
      console.error('1. Token is correct in .env.local');
      console.error('2. Token has "Write" permission for Files');
      console.error('3. No extra spaces in the .env.local file');
    }
    
    process.exit(1);
  }
}

// Load .env.local file
require('dotenv').config({ path: '.env.local' });

testPinata();
