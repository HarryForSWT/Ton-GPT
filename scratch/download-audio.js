const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = 'https://uevfjqyqghipmbxatbel.supabase.co';
const key = 'sb_publishable_S54jRNOoP4Y_kbSWqLRVYw_O-5V5RYI';
const supabase = createClient(url, key);

async function download() {
  const fileName = '1781383063476.webm';
  console.log(`Downloading ${fileName}...`);
  
  const { data, error } = await supabase.storage
    .from('student-audio')
    .download(fileName);
    
  if (error) {
    console.error('Download error:', error);
    return;
  }
  
  const buffer = Buffer.from(await data.arrayBuffer());
  const destPath = path.join(__dirname, fileName);
  fs.writeFileSync(destPath, buffer);
  console.log(`Saved to ${destPath}`);
  console.log(`File size in bytes: ${buffer.length}`);
  console.log(`First 20 bytes (Hex):`, buffer.slice(0, 20).toString('hex'));
  console.log(`First 20 bytes (ASCII):`, buffer.slice(0, 20).toString('ascii'));
}

download();
