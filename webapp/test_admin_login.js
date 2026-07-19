import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file for credentials
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@purenutrix.in',
    password: 'AdminPassword2026!'
  });
  
  if (error) {
    console.error("Login failed:", error.message);
    return;
  }
  
  console.log("Login successful! User ID:", data.user.id);
  
  const { data: roleData, error: roleError } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('id', data.user.id)
    .single();
    
  if (roleError) {
    console.error("Role fetch failed:", roleError.message);
  } else {
    console.log("Role fetched successfully:", roleData.role);
  }
}

testLogin();
