import { supabase, getCurrentUser } from './supabaseAuth';

export async function logActivity(action_type: string, module_name: string, description: string) {
  try {
    const user = await getCurrentUser();
    // Default to mtask_user_email or 'System' if no user session is active
    const user_email = user?.email || localStorage.getItem('mtask_user_email') || 'System';

    const { error } = await supabase.from('app_activities').insert([
      {
        user_email,
        action_type,
        module: module_name,
        details: description,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}
