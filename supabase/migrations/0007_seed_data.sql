-- ─── Seed data (sample) ─────────────────────────────────────────────
-- Insert this after running migrations 0001-0006.
-- To reset: truncate all tables cascade; then re-run.

-- Admin user (use a real UUID in production)
insert into users (id, email, name, role, last_login_at)
values (
  'user-admin-001',
  'ola.kperogi@aria.example',
  'Ola Kperogi',
  'ADMIN',
  now()
)
on conflict (email) do nothing;

-- Sample devices
insert into devices (device_id, name, type, room, status, battery, signal, ip_address, firmware, last_seen_at) values
  ('D-001', 'Ola''s iPhone 15 Pro', 'PHONE', 'Personal', 'ONLINE', 87, -58, '10.0.1.24', '17.4.1', now()),
  ('D-002', 'Living Room Speaker', 'SPEAKER', 'Living Room', 'ONLINE', 100, -42, '10.0.1.51', '4.2.1', now()),
  ('D-003', 'Kitchen Display', 'DISPLAY', 'Kitchen', 'IDLE', 64, -71, '10.0.1.62', '4.2.1', now() - interval '3 minutes'),
  ('D-004', 'Bedroom Hub', 'SPEAKER', 'Bedroom', 'CHARGING', 42, -55, '10.0.1.73', '3.8.2', now()),
  ('D-005', 'Galaxy Watch6', 'WATCH', 'Personal', 'ONLINE', 73, -67, '10.0.1.88', '2.1.0', now() - interval '1 minute'),
  ('D-006', 'AirPods Pro', 'HEADPHONES', 'Personal', 'ONLINE', 28, -49, '10.0.1.91', '7B19', now()),
  ('D-007', 'Office iPad', 'TABLET', 'Office', 'OFFLINE', 12, 0, '10.0.1.104', '17.4.1', now() - interval '2 hours'),
  ('D-008', 'Garage Speaker', 'SPEAKER', 'Garage', 'IDLE', 91, -84, '10.0.1.112', '4.1.7', now() - interval '18 minutes')
on conflict (device_id) do nothing;

-- Sample voice commands
insert into voice_commands (transcript, intent, confidence, status, device_id, issued_at) values
  ('Turn on the living room lights at 60% brightness', 'lights.on', 0.97, 'SUCCESS', (select id from devices where device_id = 'D-002'), now() - interval '8 minutes'),
  ('Set an alarm for 7 AM tomorrow', 'alarm.set', 0.99, 'SUCCESS', (select id from devices where device_id = 'D-001'), now() - interval '12 minutes'),
  ('Play my focus playlist on the bedroom speaker', 'media.play', 0.92, 'SUCCESS', (select id from devices where device_id = 'D-004'), now() - interval '19 minutes'),
  ('What is the weather forecast for the weekend', 'weather.query', 0.78, 'PARTIAL', (select id from devices where device_id = 'D-003'), now() - interval '26 minutes'),
  ('Call mum on speakerphone', 'call.initiate', 0.95, 'SUCCESS', (select id from devices where device_id = 'D-001'), now() - interval '33 minutes'),
  ('Remind me to take out the trash at 6', 'reminder.create', 0.41, 'FAILED', (select id from devices where device_id = 'D-005'), now() - interval '42 minutes'),
  ('Decrease the thermostat by two degrees', 'climate.adjust', 0.94, 'SUCCESS', (select id from devices where device_id = 'D-002'), now() - interval '50 minutes');

-- Sample security alerts
insert into security_alerts (title, description, severity, status, device_id, triggered_at) values
  ('Unrecognized voice profile', 'An unregistered voice attempted to issue the command "unlock front door". Access was denied and the event was logged.', 'CRITICAL', 'OPEN', (select id from devices where device_id = 'D-002'), now() - interval '2 minutes'),
  ('Microphone access blocked', 'App "QuickWeather" requested background microphone access. Request auto-denied per privacy policy.', 'CRITICAL', 'OPEN', (select id from devices where device_id = 'D-001'), now() - interval '47 minutes'),
  ('Unusual location sign-in', 'Aria Cloud account accessed from Lekki, Lagos — a new location.', 'WARNING', 'OPEN', null, now() - interval '1 hour'),
  ('Device firmware out of date', 'Bedroom Hub is running firmware 3.8.2 — version 4.0.1 patches CVE-2025-31822.', 'WARNING', 'OPEN', (select id from devices where device_id = 'D-004'), now() - interval '3 hours'),
  ('New device paired', 'Galaxy Watch6 was successfully paired to your Aria account.', 'INFO', 'OPEN', (select id from devices where device_id = 'D-005'), now() - interval '24 hours'),
  ('Security scan completed', 'Weekly security scan finished. No anomalies detected.', 'SUCCESS', 'OPEN', null, now() - interval '26 hours');
