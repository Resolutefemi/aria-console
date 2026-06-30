import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recordAuditLog } from '@/lib/audit'

/**
 * POST /api/device/[id]/smart-control
 * Control a smart device by voice command.
 *
 * Body: { deviceType, deviceName?, room?, command, params? }
 *
 * Supports all smart device types:
 * - LIGHT: ON, OFF, SET_BRIGHTNESS, DIM, BRIGHTEN
 * - THERMOSTAT: SET_TEMPERATURE, SET_MODE, STATUS
 * - LOCK: LOCK, UNLOCK, STATUS
 * - CAMERA: SHOW_FEED
 * - SPEAKER: PLAY, PAUSE, STOP, SKIP, VOLUME_UP, VOLUME_DOWN, SET_VOLUME
 * - TV: ON, OFF, VOLUME_UP, VOLUME_DOWN, MUTE, CHANNEL_UP, CHANNEL_DOWN
 * - VACUUM: START, STOP, DOCK
 * - GARAGE: OPEN, CLOSE, STATUS
 * - DOORBELL: SHOW_FEED
 * - PLUG: ON, OFF, STATUS
 * - FRIDGE: STATUS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { deviceType, deviceName, room, command, params: cmdParams } = body

    // Verify device exists
    const device = await db.device.findUnique({ where: { id } })
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Build the command record
    const commandType = mapSmartCommandToDeviceCommand(deviceType, command)

    // Create a device command
    const deviceCommand = await db.deviceCommand.create({
      data: {
        deviceId: device.id,
        type: commandType,
        payload: {
          deviceType,
          deviceName,
          room,
          command,
          params: cmdParams,
        },
      },
    })

    // Record in audit log
    await recordAuditLog({
      action: `smart_device.${command.toLowerCase()}`,
      resource: 'device',
      resourceId: device.id,
      metadata: { deviceType, deviceName, room, command, params: cmdParams },
    })

    // Build human-readable response
    const deviceLabel = deviceName || room || deviceType.toLowerCase()
    const message = buildResponseMessage(deviceType, command, deviceLabel, cmdParams)

    return NextResponse.json({
      success: true,
      commandId: deviceCommand.id,
      message,
    })
  } catch (error) {
    console.error('POST /api/device/[id]/smart-control error:', error)
    return NextResponse.json({ error: 'Failed to execute smart device command' }, { status: 500 })
  }
}

function mapSmartCommandToDeviceCommand(deviceType: string, command: string): string {
  // Map smart device commands to DeviceCommandType enum values
  if (deviceType === 'PHONE') {
    if (command === 'LOCK_DEVICE') return 'LOCK_DEVICE'
    if (command === 'UNLOCK_DEVICE') return 'UNLOCK_DEVICE'
    if (command === 'RING_DEVICE') return 'RING_DEVICE'
    if (command === 'REQUEST_LOCATION') return 'REQUEST_LOCATION'
  }

  if (deviceType === 'LOCK') {
    if (command === 'LOCK') return 'LOCK_DEVICE'
    if (command === 'UNLOCK') return 'UNLOCK_DEVICE'
  }

  if (deviceType === 'CAMERA' || deviceType === 'DOORBELL') {
    if (command === 'SHOW_FEED') return 'REQUEST_SCREENSHOT'
  }

  if (deviceType === 'SPEAKER') {
    if (command === 'PLAY') return 'SEND_MESSAGE'
    if (command === 'PAUSE') return 'SEND_MESSAGE'
    if (command === 'STOP') return 'SEND_MESSAGE'
  }

  // Default: send as a message command with the action details
  return 'SEND_MESSAGE'
}

function buildResponseMessage(
  deviceType: string,
  command: string,
  deviceLabel: string,
  params: any
): string {
  switch (command) {
    case 'ON': return `Turned on the ${deviceLabel}.`
    case 'OFF': return `Turned off the ${deviceLabel}.`
    case 'LOCK': return `Locked the ${deviceLabel}.`
    case 'UNLOCK': return `Unlocked the ${deviceLabel}.`
    case 'PLAY': return `Playing music on the ${deviceLabel}.`
    case 'PAUSE': return `Paused the ${deviceLabel}.`
    case 'STOP': return `Stopped the ${deviceLabel}.`
    case 'SET_TEMPERATURE': return `Set the ${deviceLabel} to ${params?.temp} degrees.`
    case 'SET_BRIGHTNESS': return `Set the ${deviceLabel} brightness to ${params?.brightness} percent.`
    case 'SET_VOLUME': return `Set the ${deviceLabel} volume to ${params?.volume} percent.`
    case 'OPEN': return `Opened the ${deviceLabel}.`
    case 'CLOSE': return `Closed the ${deviceLabel}.`
    case 'START': return `Started the ${deviceLabel}.`
    case 'SHOW_FEED': return `Showing the ${deviceLabel} camera feed.`
    case 'STATUS': return `The ${deviceLabel} is active.`
    default: return `Done.`
  }
}
