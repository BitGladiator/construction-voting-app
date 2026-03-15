import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

// Create a Supabase client with the SERVICE ROLE KEY (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestUsers() {
  console.log('Starting Test User Setup...');

  const usersToCreate = [
    {
      email: 'admin@test.com',
      password: 'password123',
      fullName: 'Test Admin',
      role: 'admin',
    },
    {
      email: 'partner@test.com',
      password: 'password123',
      fullName: 'Test Partner',
      role: 'partner',
    },
  ];

  for (const user of usersToCreate) {
    console.log(`\nCreating user: ${user.email} (${user.role})...`);
    
    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: user.fullName,
      }
    });

    if (authError) {
      if (authError.message.includes('User already registered')) {
         console.log(`User ${user.email} already exists in Auth. Skipping creation.`);
         continue;
      }
      console.error(`=> Error creating auth user for ${user.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    console.log(`=> Auth user created. ID: ${userId}`);

    // 2. Insert into the `profiles` table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: user.fullName,
        email: user.email,
        role: user.role,
      });

    if (profileError) {
      console.error(`=> Error creating profile for ${user.email}:`, profileError.message);
    } else {
      console.log(`=> Profile created for ${user.email}`);
    }
  }

  console.log('\nTest User Setup Complete!');
  console.log('You can now log in with:');
  console.log('Admin: admin@test.com / password123');
  console.log('Partner: partner@test.com / password123');
}

createTestUsers();
