import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mctxddpcpxpinckqegmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jdHhkZHBjcHhwaW5ja3FlZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NjQ5MzQsImV4cCI6MjA1OTQ0MDkzNH0.k4TlSS2OtA90FcYbUcKWGeJ2hvdNsBZqI_lGSdGyH0I';

const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
