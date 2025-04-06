import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

console.log("SUPABASE_URL:", process.env.REACT_APP_SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.REACT_APP_SUPABASE_ANON_KEY);

