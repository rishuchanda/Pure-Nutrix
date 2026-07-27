import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ashwagandhaProduct = {
  name: "Pure Nutrix Ashwagandha Root Extract Capsules 500mg – Natural Stress Relief, Energy & Immunity Support (30 Capsules)",
  category: "STRESS & IMMUNITY",
  price: 399,
  original_price: 999,
  product_form: "Capsules",
  quantity: "30",
  product_type: "Adaptogen Supplement",
  composition: "Ashwagandha Root Extract 500mg",
  pack_of: 1,
  usage_instructions: "Take 1 capsule daily after a meal or as directed by a healthcare professional.",
  nutrient_content: "Ashwagandha Root Extract: 500mg per capsule",
  short_description: "Boost your daily vitality and mental clarity with Pure Nutrix Ashwagandha Premium Root Extract. Formulated with 500mg of 100% pure, root-derived ashwagandha per capsule, this clinically proven adaptogen helps your body naturally adapt to physical and mental stress, combat fatigue, and strengthen immune health without causing drowsiness.",
  image_urls: [
    "/assets/products/ashwagandha/1.jpg",
    "/assets/products/ashwagandha/2.jpg",
    "/assets/products/ashwagandha/3.jpg",
    "/assets/products/ashwagandha/4.jpg",
    "/assets/products/ashwagandha/5.jpg",
    "/assets/products/ashwagandha/6.jpg",
    "/assets/products/ashwagandha/7.jpg"
  ],
  stock: 100
};

async function addOrUpdateAshwagandha() {
  console.log("Logging in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@purenutrix.in',
    password: 'AdminPassword2026!'
  });

  if (authError) {
    console.error("Admin login failed:", authError.message);
    return;
  }
  console.log("Logged in successfully! User ID:", authData.user.id);

  console.log("Checking if Ashwagandha already exists in database...");
  const { data: existing, error: searchError } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%ashwagandha%');

  if (searchError) {
    console.error("Error checking existing product:", searchError.message);
    return;
  }

  if (existing && existing.length > 0) {
    console.log(`Found existing Ashwagandha product (ID: ${existing[0].id}). Updating...`);
    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update(ashwagandhaProduct)
      .eq('id', existing[0].id)
      .select();

    if (updateError) {
      console.error("Error updating product:", updateError.message);
    } else {
      console.log("Successfully updated Ashwagandha product in Supabase:", updated);
    }
  } else {
    console.log("No existing Ashwagandha found. Inserting new product...");
    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert([ashwagandhaProduct])
      .select();

    if (insertError) {
      console.error("Error inserting product:", insertError.message);
    } else {
      console.log("Successfully inserted Ashwagandha product in Supabase:", inserted);
    }
  }
}

addOrUpdateAshwagandha();
