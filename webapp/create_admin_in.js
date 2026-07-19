import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file for credentials
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@purenutrix.in',
    password: 'AdminPassword2026!'
  });
  if (error) {
    console.error('Error creating admin:', error.message);
  } else {
    console.log('Admin created successfully! User ID:', data.user.id);
  }
}

createAdmin();
