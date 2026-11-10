import 'package:flutter/material.dart';

import '../data/models.dart';

// ─── Formatting helpers ───────────────────────────────────────────────

String timeAgo(DateTime? time) {
  if (time == null) return 'never';
  final diff = DateTime.now().difference(time.toLocal());
  if (diff.inSeconds < 45) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${time.toLocal().month}/${time.toLocal().day}';
}

String clockTime(DateTime? time) {
  if (time == null) return '—';
  final t = time.toLocal();
  final hh = t.hour.toString().padLeft(2, '0');
  final mm = t.minute.toString().padLeft(2, '0');
  return '$hh:$mm';
}

String dateLabel(DateTime? time) {
  if (time == null) return '—';
  final t = time.toLocal();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${months[t.month - 1]} ${t.day}';
}

/// 3725 sec → "1h 2m"
String durationLabel(int? seconds) {
  if (seconds == null || seconds <= 0) return '0m';
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  if (h > 0) return '${h}h ${m}m';
  return '${m}m';
}

String batteryIcon(int battery, DeviceStatus status) {
  return switch (status) {
    DeviceStatus.charging => '⚡',
    _ => '',
  };
}

// ─── Icons / colors for device types ──────────────────────────────────

IconData deviceTypeIcon(DeviceType type) {
  return switch (type) {
    DeviceType.phone => Icons.smartphone_rounded,
    DeviceType.tablet => Icons.tablet_mac_rounded,
    DeviceType.watch => Icons.watch_rounded,
    DeviceType.speaker => Icons.speaker_rounded,
    DeviceType.headphones => Icons.headphones_rounded,
    DeviceType.laptop || DeviceType.display => Icons.laptop_mac_rounded,
    DeviceType.tv => Icons.tv_rounded,
    DeviceType.camera => Icons.videocam_rounded,
    DeviceType.light => Icons.lightbulb_rounded,
    DeviceType.lock => Icons.lock_rounded,
    DeviceType.plug => Icons.power_rounded,
    DeviceType.thermostat => Icons.thermostat_rounded,
    DeviceType.doorbell => Icons.doorbell_rounded,
    DeviceType.garage => Icons.garage_rounded,
    DeviceType.vacuum => Icons.cleaning_services_rounded,
    DeviceType.fridge => Icons.kitchen_rounded,
    DeviceType.unknown => Icons.devices_other_rounded,
  };
}

Color statusColor(DeviceStatus status) {
  return switch (status) {
    DeviceStatus.online => const Color(0xFF22A06B),
    DeviceStatus.charging => const Color(0xFF22A06B),
    DeviceStatus.idle => const Color(0xFFE8A23D),
    DeviceStatus.offline => Colors.grey,
  };
}

Color severityColor(AlertSeverity severity) {
  return switch (severity) {
    AlertSeverity.critical => const Color(0xFFF94144),
    AlertSeverity.warning => const Color(0xFFE8A23D),
    AlertSeverity.info => const Color(0xFF4BA3F5),
    AlertSeverity.success => const Color(0xFF22A06B),
  };
}

/// Human label for DB command types: LOCK_DEVICE → Lock device
String commandLabel(String type) {
  final lower = type.toLowerCase();
  final parts = lower.split('_');
  final words = parts.map((p) {
    if (p.isEmpty) return p;
    return '${p[0].toUpperCase()}${p.substring(1)}';
  });
  return words.join(' ');
}

IconData commandIcon(String type) {
  return switch (type.toUpperCase()) {
    'LOCK_DEVICE' => Icons.lock_rounded,
    'UNLOCK_DEVICE' => Icons.lock_open_rounded,
    'BLOCK_APP' => Icons.block_rounded,
    'UNBLOCK_APP' => Icons.check_circle_outline_rounded,
    'SET_TIME_LIMIT' => Icons.timer_rounded,
    'REQUEST_LOCATION' => Icons.location_searching_rounded,
    'REQUEST_SCREENSHOT' => Icons.screenshot_monitor_rounded,
    'SEND_MESSAGE' => Icons.chat_rounded,
    'RING_DEVICE' => Icons.notifications_active_rounded,
    'SET_BRIGHTNESS' => Icons.brightness_6_rounded,
    'SET_VOLUME' => Icons.volume_up_rounded,
    _ => Icons.settings_remote_rounded,
  };
}
