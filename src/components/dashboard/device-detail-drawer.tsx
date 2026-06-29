'use client'

import { useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Battery, Wifi, Cpu, Clock, MapPin, Activity } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

type Device = {
  id: string
  deviceId: string
  name: string
  type: string
  room: string
  status: string
  battery: number
  signal: number
  ipAddress: string | null
  firmware: string | null
  lastSeenAt: string
  createdAt: string
}

type RecentCommand = {
  id: string
  transcript: string
  intent: string
  confidence: number
  status: string
  issuedAt: string
}

type Props = {
  deviceId: string | null
  open: boolean
  onClose: () => void
}

export function DeviceDetailDrawer({ deviceId, open, onClose }: Props) {
  // Fetch device details
  const { data: deviceData } = useApi<{ devices: Device[] }>(
    deviceId ? `/api/devices?deviceId=${deviceId}` : null
  )
  const { data: commandData } = useApi<{ commands: RecentCommand[] }>(
    deviceId ? `/api/voice/commands?deviceId=${deviceData?.devices[0]?.id}&limit=10` : null
  )

  const device = deviceData?.devices[0]
  const commands = commandData?.commands ?? []

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{device?.name ?? 'Loading…'}</SheetTitle>
          <SheetDescription>
            {device?.deviceId} · {device?.room}
          </SheetDescription>
        </SheetHeader>

        {device && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailCard icon={<Battery className="w-3.5 h-3.5" />} label="Battery" value={`${device.battery}%`} />
              <DetailCard icon={<Wifi className="w-3.5 h-3.5" />} label="Signal" value={`${device.signal} dBm`} />
              <DetailCard icon={<Cpu className="w-3.5 h-3.5" />} label="Firmware" value={device.firmware ?? 'Unknown'} />
              <DetailCard icon={<MapPin className="w-3.5 h-3.5" />} label="IP Address" value={device.ipAddress ?? 'Unknown'} />
              <DetailCard icon={<Clock className="w-3.5 h-3.5" />} label="Last seen" value={new Date(device.lastSeenAt).toLocaleString()} />
              <DetailCard icon={<Activity className="w-3.5 h-3.5" />} label="Status" value={device.status} />
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Recent commands</h3>
              {commands.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent voice commands for this device.</p>
              ) : (
                <ul className="space-y-2">
                  {commands.map((c) => (
                    <li key={c.id} className="text-xs">
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {new Date(c.issuedAt).toLocaleTimeString()}
                      </div>
                      <div className="text-foreground">"{c.transcript}"</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{c.intent}</Badge>
                        <span className="text-[10px] text-muted-foreground">{(c.confidence * 100).toFixed(0)}% confidence</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium truncate">{value}</div>
    </div>
  )
}
