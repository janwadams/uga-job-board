//for toggle switch - 11/26/25

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: settings, error } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // convert to object for easy access
  const settingsObj = settings.reduce((acc, { setting_key, setting_value }) => {
    acc[setting_key] = setting_value;
    return acc;
  }, {} as Record<string, boolean>);

  return NextResponse.json(settingsObj);
}

export async function PATCH(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  const { setting_key, setting_value } = await request.json();

  const { error } = await supabase
    .from('app_settings')
    .update({ 
      setting_value, 
      updated_at: new Date().toISOString(),
      updated_by: user?.id 
    })
    .eq('setting_key', setting_key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}