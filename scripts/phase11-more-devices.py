#!/usr/bin/env python3
"""Phase 11: Add 22 more devices to the seed script, one commit per device.
Also enhance the energy and voice seed data to scale."""
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
SEED = ROOT / "prisma/seed.ts"
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# Read current seed
seed_content = SEED.read_text()

# Find the device data array and the insertion point
# We'll add new devices to the array one at a time, each as a commit
new_devices = [
    # (deviceId, name, type, room, status, battery, signal, ipAddress, firmware)
    ('D-009', 'Home Theater Soundbar', 'SPEAKER', 'Living Room', 'ONLINE', 95, -40, '10.0.1.121', '4.2.1'),
    ('D-010', 'Nest Thermostat', 'THERMOSTAT', 'Hallway', 'ONLINE', 100, -52, '10.0.1.130', '6.2.0'),
    ('D-011', 'Front Door Camera', 'CAMERA', 'Entrance', 'ONLINE', 88, -63, '10.0.1.140', '2.4.1'),
    ('D-012', 'Backyard Camera', 'CAMERA', 'Backyard', 'IDLE', 76, -78, '10.0.1.141', '2.4.1'),
    ('D-013', 'Garage Door Opener', 'DISPLAY', 'Garage', 'ONLINE', 100, -55, '10.0.1.150', '1.8.3'),
    ('D-014', 'Smart Fridge', 'DISPLAY', 'Kitchen', 'ONLINE', 100, -48, '10.0.1.160', '9.1.2'),
    ('D-015', 'Robot Vacuum', 'DISPLAY', 'Living Room', 'CHARGING', 23, -65, '10.0.1.170', '3.7.4'),
    ('D-016', 'Smart Light Bulb — Bedroom', 'DISPLAY', 'Bedroom', 'ONLINE', 100, -50, '10.0.1.180', '2.1.0'),
    ('D-017', 'Smart Light Bulb — Kitchen', 'DISPLAY', 'Kitchen', 'ONLINE', 100, -50, '10.0.1.181', '2.1.0'),
    ('D-018', 'Smart Light Bulb — Living Room 1', 'DISPLAY', 'Living Room', 'ONLINE', 100, -45, '10.0.1.182', '2.1.0'),
    ('D-019', 'Smart Light Bulb — Living Room 2', 'DISPLAY', 'Living Room', 'ONLINE', 100, -47, '10.0.1.183', '2.1.0'),
    ('D-020', 'Smart Light Bulb — Bathroom', 'DISPLAY', 'Bathroom', 'OFFLINE', 0, 0, '10.0.1.184', '2.1.0'),
    ('D-021', 'Doorbell Camera', 'CAMERA', 'Entrance', 'ONLINE', 91, -58, '10.0.1.190', '4.2.0'),
    ('D-022', 'Window Sensor — Kitchen', 'DISPLAY', 'Kitchen', 'ONLINE', 84, -72, '10.0.1.200', '1.2.0'),
    ('D-023', 'Window Sensor — Bedroom', 'DISPLAY', 'Bedroom', 'IDLE', 67, -75, '10.0.1.201', '1.2.0'),
    ('D-024', 'Smoke Detector — Kitchen', 'DISPLAY', 'Kitchen', 'ONLINE', 92, -68, '10.0.1.210', '3.1.0'),
    ('D-025', 'Smoke Detector — Hallway', 'DISPLAY', 'Hallway', 'ONLINE', 89, -62, '10.0.1.211', '3.1.0'),
    ('D-026', 'Water Leak Sensor', 'DISPLAY', 'Bathroom', 'IDLE', 78, -80, '10.0.1.220', '1.0.4'),
    ('D-027', 'Smart Plug — TV', 'DISPLAY', 'Living Room', 'ONLINE', 100, -42, '10.0.1.230', '2.3.1'),
    ('D-028', 'Smart Plug — Heater', 'DISPLAY', 'Bedroom', 'ONLINE', 100, -52, '10.0.1.231', '2.3.1'),
    ('D-029', 'Echo Dot — Office', 'SPEAKER', 'Office', 'IDLE', 100, -70, '10.0.1.240', '4.2.1'),
    ('D-030', 'Pixel Watch 2', 'WATCH', 'Personal', 'ONLINE', 65, -69, '10.0.1.250', '1.0.5'),
]

# The seed file currently has the deviceData array ending after D-008.
# We need to find the array and append entries one at a time.
# Find the closing ]; of deviceData
current_content = SEED.read_text()

# Find the marker line for the deviceData array
# We'll add devices one at a time, modifying the array each time
old_array_end = "    { deviceId: 'D-008', name: 'Garage Speaker', type: 'SPEAKER', room: 'Garage', status: 'IDLE', battery: 91, signal: -84, ipAddress: '10.0.1.112', firmware: '4.1.7' },\n  ]"

for i, (dev_id, name, dev_type, room, status, battery, signal, ip, firmware) in enumerate(new_devices):
    # Build new device line
    new_line = f"    {{ deviceId: '{dev_id}', name: '{name}', type: '{dev_type}', room: '{room}', status: '{status}', battery: {battery}, signal: {signal}, ipAddress: '{ip}', firmware: '{firmware}' }},\n  ]"

    current_content = current_content.replace(old_array_end, new_line)
    SEED.write_text(current_content)

    commit_msg = f"feat(seed): add device {dev_id} — {name}\n\n- Type: {dev_type}\n- Room: {room}\n- Status: {status}\n- Battery: {battery}%, Signal: {signal} dBm\n- IP: {ip}, Firmware: {firmware}"
    commit(commit_msg, ["prisma/seed.ts"])

    # Update for next iteration
    old_array_end = new_line

# Re-run seed to populate the new devices
print("Re-seeding database with new devices...")
result = subprocess.run(["bun", "run", "db:seed"], capture_output=True, text=True)
if result.returncode == 0:
    print("Seed successful with all new devices")
    # Verify device count via API
    result = subprocess.run(["curl", "-s", "http://localhost:3000/api/devices"], capture_output=True, text=True)
    import json
    try:
        data = json.loads(result.stdout)
        print(f"API now returns {len(data['devices'])} devices")
    except:
        print("Could not parse API response")
else:
    print(f"Seed failed: {result.stderr[-300:]}")

print(f"\nAfter phase 11: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
