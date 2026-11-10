import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, acknowledgedBy } = body

    const updates: Record<string, unknown> = { status }
    if (status === 'ACKNOWLEDGED') {
      updates.acknowledged_at = new Date().toISOString()
      updates.acknowledged_by = acknowledgedBy ?? 'system'
    }

    const admin = getAdminClient()
    const { data: alert, error } = await admin
      .from('security_alerts')
      .update(updates)
      .eq('id', id)
      .select('*, device:devices(name, device_id)')
      .single()

    if (error) throw error

    // Record in audit log
    await recordAuditLog({
      action: status === 'ACKNOWLEDGED' ? AUDIT_ACTIONS.ALERT_ACKNOWLEDGE : status === 'DISMISSED' ? AUDIT_ACTIONS.ALERT_DISMISS : AUDIT_ACTIONS.ALERT_RESOLVE,
      resource: 'security_alert',
      resourceId: id,
      metadata: { status, acknowledgedBy, alertTitle: alert.title },
    })

    return NextResponse.json({ alert: serialize(alert) })
  } catch (error) {
    console.error('PATCH /api/security/alerts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
