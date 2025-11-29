// Supabase client configuration
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://drlkgrumakxitjprvqws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybGtncnVtYWt4aXRqcHJ2cXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ0Mzc0OSwiZXhwIjoyMDgwMDE5NzQ5fQ.j8uSMtPNkG-i3-GbNKd1Z0TgysS6hjwPZ23-Fstxano';

// Create Supabase client with service role key (bypasses RLS for server-side operations)
const supabase = createClient(supabaseUrl, supabaseKey);

// Create Supabase client with anon key for client-side operations (respects RLS)
const supabaseAnon = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybGtncnVtYWt4aXRqcHJ2cXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NDM3NDksImV4cCI6MjA4MDAxOTc0OX0.PernE77_AAi_l6Wz41qosSY_gXvXZX2ptzToOlZb1Vk'
);

// Test the connection
supabase
  .from('users')
  .select('count')
  .limit(1)
  .then(() => {
    console.log('\x1b[32m%s\x1b[0m', '✓ Supabase connected successfully');
    console.log('  URL:', supabaseUrl);
  })
  .catch(err => {
    console.error('\x1b[31m%s\x1b[0m', '✗ Supabase connection failed');
    console.error('  Error:', err.message);
  });

// Export both clients
module.exports = supabase;
module.exports.supabase = supabase;
module.exports.supabaseAnon = supabaseAnon;

// Helper function to convert Supabase query result to MySQL-like format
// This maintains compatibility with existing route code
module.exports.query = async (queryString, params = []) => {
  try {
    // This is a simplified wrapper - routes will need to be updated to use Supabase syntax
    // For now, we'll provide a basic structure
    console.warn('Warning: Using legacy query() method. Consider updating routes to use Supabase client directly.');
    
    // Parse simple SELECT queries (basic implementation)
    if (queryString.trim().toUpperCase().startsWith('SELECT')) {
      // Extract table name and conditions (simplified)
      const tableMatch = queryString.match(/FROM\s+(\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        let query = supabase.from(table).select('*');
        
        // Handle WHERE clauses with ? placeholders
        if (queryString.includes('WHERE') && params.length > 0) {
          const whereMatch = queryString.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
          if (whereMatch) {
            const whereClause = whereMatch[1];
            // Simple parameter replacement (basic implementation)
            let processedClause = whereClause;
            params.forEach((param, index) => {
              processedClause = processedClause.replace(/\?/, `'${param}'`);
            });
            // Note: This is a simplified approach. For production, use Supabase's query builder
          }
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return [[data], []]; // Return MySQL-like format [rows, fields]
      }
    }
    
    // For INSERT, UPDATE, DELETE - routes should be updated to use Supabase directly
    throw new Error('Please update routes to use Supabase client directly. Legacy query() method has limited support.');
  } catch (error) {
    throw error;
  }
};
