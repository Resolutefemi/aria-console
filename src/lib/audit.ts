import { db } from '@/lib/db'
import { headers } from 'next/headers'

/**
 * Record an audit log entry from a server-side action.
 * Captures IP and user agent from request headers automatically.
 */
export async function recordAuditLog(params: {
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  userId?: string
}) {
  try {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') ?? null
    const userAgent = headersList.get('user-agent')

    return await db.auditLog.create({
      data: {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        userId: params.userId,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Audit logging should never break the main operation
    console.error('Failed to record audit log:', error)
    return null
  }
}

/**
 * Common audit actions.
 */
export const AUDIT_ACTIONS = {
  ALERT_ACKNOWLEDGE: 'alert.acknowledged',
  ALERT_DISMISS: 'alert.dismissed',
  ALERT_RESOLVE: 'alert.resolved',
  DEVICE_REFRESH: 'device.refreshed',
  DEVICE_UPDATE: 'device.updated',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  EXPORT_CSV: 'export.csv',
} as const
