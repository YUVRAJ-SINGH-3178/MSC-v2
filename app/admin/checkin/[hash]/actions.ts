'use server';

import { getAdminClient } from '@/lib/supabase/admin';

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function checkInTeamServerAction(eventId: string, teamName: string, teamId?: string): Promise<ActionResponse> {
  try {
    const supabase = getAdminClient();
    let query = supabase
      .from('registrations')
      .update({
        checked_in: true,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    if (teamId) {
      query = query.filter('team_data->>team_id', 'eq', teamId);
    } else {
      query = query.filter('team_data->>team_name', 'eq', teamName);
    }

    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: `Entire team ${teamName} checked in successfully!` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function checkInMemberServerAction(registrationId: string): Promise<ActionResponse> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('registrations')
      .update({
        checked_in: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Attendee admission recorded!' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
