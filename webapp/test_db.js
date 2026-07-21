import { supabase } from './src/supabaseClient.js';
async function test() {
  const { data, error } = await supabase.from('products').select('*');
  console.log(JSON.stringify(data, null, 2));
}
test();
