import { supabase } from './src/supabaseClient';

async function run() {
  console.log("Connected to Supabase DB via JS Client. Patching older ledger entries...");
  
  try {
    // Set admin_submitted_at to NOW() for all unapproved ledger entries that don't have it set
    // but ONLY those that were actually submitted by the staff or were created before admin_submitted_at existed.
    // In our case, we want to restore any is_approved=false that the user was seeing before.
    
    // First, let's just see how many there are:
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('id, admin_submitted_at, is_approved')
      .eq('is_approved', false)
      .is('admin_submitted_at', null);

    if (error) throw error;
    
    console.log(`Found ${data?.length || 0} ledger entries to patch.`);

    if (data && data.length > 0) {
      const nowStr = new Date().toISOString();
      const ids = data.map((d: any) => d.id);
      
      const { error: updateError } = await supabase
        .from('ledger_entries')
        .update({ admin_submitted_at: nowStr })
        .in('id', ids);
        
      if (updateError) throw updateError;
      
      console.log(`Successfully patched ${ids.length} rows.`);
    }

  } catch (err) {
    console.error("Migration failed:", err);
  }
}

run();
