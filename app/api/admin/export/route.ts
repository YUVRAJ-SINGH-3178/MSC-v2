import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimit = await checkRateLimit(auth.user.id, 'api');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a minute before trying again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'xlsx';
    const eventId = searchParams.get('event_id');

    const supabase = getAdminClient();
    let query = supabase
      .from('registrations')
      .select('*, events(title)')
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: rawRows, error } = await query;
    if (error) throw error;

    const csvData = (rawRows || []).map((r: any) => ({
      'Ticket ID': r.form_data?.ticket_id || r.hash_payload || r.id,
      Role: r.form_data?.role || r.team_data?.role || (r.team_data?.team_name ? 'Member' : 'Solo'),
      Name: r.form_data?.full_name || r.form_data?.name || r.lead_email.split('@')[0],
      Email: r.lead_email,
      'Reg Num': r.form_data?.registration_number || r.form_data?.reg_num || 'N/A',
      Mobile: r.form_data?.phone || r.phone || 'N/A',
      Branch: r.form_data?.branch || 'N/A',
      'Team Name': r.team_data?.team_name || 'Individual',
      'Team Size': r.team_data?.team_size ? String(r.team_data.team_size) : (r.team_data?.team_name ? 'Team' : '1'),
      Status: (r.status || 'confirmed').toUpperCase(),
      'Registration Date': r.created_at,
    }));

    if (format === 'csv') {
      const csv = Papa.unparse(csvData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="MSC_Registrations_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Microsoft Student Community SRM AP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Registrations');

    sheet.columns = [
      { header: 'Ticket ID', key: 'ticket_id', width: 16 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Reg Num', key: 'reg_num', width: 18 },
      { header: 'Mobile', key: 'mobile', width: 16 },
      { header: 'Branch', key: 'branch', width: 14 },
      { header: 'Team Name', key: 'team_name', width: 20 },
      { header: 'Team Size', key: 'team_size', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Registration Date', key: 'reg_date', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0067B8' },
    };

    (rawRows || []).forEach((r: any) => {
      sheet.addRow({
        ticket_id: r.form_data?.ticket_id || r.hash_payload || r.id,
        role: r.form_data?.role || r.team_data?.role || (r.team_data?.team_name ? 'Member' : 'Solo'),
        name: r.form_data?.full_name || r.form_data?.name || r.lead_email.split('@')[0],
        email: r.lead_email,
        reg_num: r.form_data?.registration_number || r.form_data?.reg_num || 'N/A',
        mobile: r.form_data?.phone || r.phone || 'N/A',
        branch: r.form_data?.branch || 'N/A',
        team_name: r.team_data?.team_name || 'Individual',
        team_size: r.team_data?.team_size ? String(r.team_data.team_size) : (r.team_data?.team_name ? 'Team' : '1'),
        status: (r.status || 'confirmed').toUpperCase(),
        reg_date: r.created_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="MSC_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error('[Excel export error]:', err);
    return NextResponse.json({ error: 'Failed to generate spreadsheet: ' + err.message }, { status: 500 });
  }
}
