import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'
import { recordAuditLog } from '@/lib/audit'

/**
 * POST /api/device/[id]/smart-control
 * Control a smart device by voice command.
 *
 * Body: { deviceType, deviceName?, room?, command, params?, sentBy? }
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
    const { deviceType, deviceName, room, command, params: cmdParams, sentBy } = body

    const admin = getAdminClient()

    // Verify device exists
    const { data: device, error: deviceError } = await admin
      .from('devices')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (deviceError) throw deviceError
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Build the command record
    const commandType = mapSmartCommandToDeviceCommand(deviceType, command)

    // Create a device command (sentBy is required — use 'voice' if not provided)
    const { data: deviceCommand, error: cmdError } = await admin
      .from('device_commands')
      .insert({
        device_id: device.id,
        type: commandType,
        sent_by: sentBy || 'voice-assistant',
        payload: {
          deviceType,
          deviceName,
          room,
          command,
          params: cmdParams,
        },
      })
      .select()
      .single()

    if (cmdError) throw cmdError

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
  // Map smart device commands to device_command_type enum values
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
    if (command === 'PLAY') return 'PLAY_MEDIA'
    if (command === 'PAUSE') return 'PAUSE_MEDIA'
    if (command === 'STOP') return 'STOP_MEDIA'
  }

  if (deviceType === 'VACUUM') {
    if (command === 'START') return 'START_VACUUM'
    if (command === 'STOP') return 'STOP_VACUUM'
  }

  if (deviceType === 'GARAGE') {
    if (command === 'OPEN') return 'OPEN_GARAGE'
    if (command === 'CLOSE') return 'CLOSE_GARAGE'
  }

  if (deviceType === 'LIGHT') {
    if (command === 'ON') return 'TURN_ON'
    if (command === 'OFF') return 'TURN_OFF'
    if (command === 'SET_BRIGHTNESS') return 'SET_BRIGHTNESS'
  }

  if (deviceType === 'THERMOSTAT') {
    if (command === 'SET_TEMPERATURE') return 'SET_TEMPERATURE'
    if (command === 'ON') return 'TURN_ON'
    if (command === 'OFF') return 'TURN_OFF'
  }

  if (deviceType === 'PLUG' || deviceType === 'TV') {
    if (command === 'ON') return 'TURN_ON'
    if (command === 'OFF') return 'TURN_OFF'
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
