const { createClient } = require('@supabase/supabase-js');

const url = 'https://uevfjqyqghipmbxatbel.supabase.co';
const key = 'sb_publishable_S54jRNOoP4Y_kbSWqLRVYw_O-5V5RYI';
const supabase = createClient(url, key);

async function list() {
  console.log('Querying pronunciation_requests...');
  const { data, error } = await supabase
    .from('pronunciation_requests')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} requests:`);
  data.forEach((r, idx) => {
    console.log(`[${idx}] ID: ${r.id}, Hanzi: ${r.hanzi}, Audio URL: ${r.student_audio_url}, Status: ${r.status}, Created: ${r.created_at}`);
  });
}

list();
