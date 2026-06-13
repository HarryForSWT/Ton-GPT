const { createClient } = require('@supabase/supabase-js');

const url = 'https://uevfjqyqghipmbxatbel.supabase.co';
const key = 'sb_publishable_S54jRNOoP4Y_kbSWqLRVYw_O-5V5RYI';
const supabase = createClient(url, key);

async function list() {
  console.log('Querying profiles...');
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} profiles:`);
  data.forEach((p, idx) => {
    console.log(`[${idx}] ID: ${p.id}, Email: ${p.email}, Display Name: ${p.display_name}, Role: ${p.role}`);
  });
}

list();
