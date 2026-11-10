/// Data models for Aria Console mobile.
///
/// Rows come from Supabase in snake_case; these factories map every
/// column explicitly so typos surface at one place only.
library;

// ─── Enums ────────────────────────────────────────────────────────────

enum DeviceType {
  phone, tablet, watch, speaker, headphones, display, thermostat, camera,
  light, lock, plug, tv, doorbell, garage, vacuum, fridge, laptop, unknown;

  static DeviceType fromName(String? raw) {
    final n = raw?.toUpperCase();
    if (n == 'LAPTOP') return DeviceType.laptop;
    return DeviceType.values.firstWhere(
      (v) => v.name.toUpperCase() == n,
      orElse: () => DeviceType.unknown,
    );
  }
}

enum DeviceStatus { online, idle, offline, charging }

extension DeviceStatusX on DeviceStatus {
  static DeviceStatus fromName(String? raw) =>
      DeviceStatus.values.firstWhere(
        (v) => v.name == raw?.toUpperCase(),
        orElse: () => DeviceStatus.offline,
      );
}

enum CommandStatus { pending, delivered, executed, failed, expired }

extension CommandStatusX on CommandStatus {
  static CommandStatus fromName(String? raw) =>
      CommandStatus.values.firstWhere(
        (v) => v.name == raw?.toUpperCase(),
        orElse: () => CommandStatus.pending,
      );
}

enum AlertSeverity { critical, warning, info, success }

extension AlertSeverityX on AlertSeverity {
  static AlertSeverity fromName(String? raw) =>
      AlertSeverity.values.firstWhere(
        (v) => v.name == raw?.toUpperCase(),
        orElse: () => AlertSeverity.info,
      );
}

enum AlertStatus { open, acknowledged, resolved, dismissed }

extension AlertStatusX on AlertStatus {
  static AlertStatus fromName(String? raw) =>
      AlertStatus.values.firstWhere(
        (v) => v.name == raw?.toUpperCase(),
        orElse: () => AlertStatus.open,
      );
}

enum PairingStatus { pending, paired, expired, revoked }

extension PairingStatusX on PairingStatus {
  static PairingStatus fromName(String? raw) =>
      PairingStatus.values.firstWhere(
        (v) => v.name == raw?.toUpperCase(),
        orElse: () => PairingStatus.pending,
      );
}

enum RuleType {
  appBlock,
  appTimeLimit,
  screenTimeLimit,
  bedtime,
  contentFilter,
  locationGeofence;

  /// DB enum is SCREAMING_SNAKE: APP_BLOCK, APP_TIME_LIMIT, …
  String get dbName {
    final buffer = StringBuffer();
    for (var i = 0; i < name.length; i++) {
      final c = name[i];
      if (c == c.toUpperCase() && c != c.toLowerCase() && i > 0) {
        buffer.write('_');
      }
      buffer.write(c.toUpperCase());
    }
    return buffer.toString();
  }

  static RuleType fromName(String? raw) => RuleType.values.firstWhere(
        (v) => v.dbName == raw?.toUpperCase(),
        orElse: () => RuleType.screenTimeLimit,
      );

  String get label => switch (this) {
        RuleType.appBlock => 'App block',
        RuleType.appTimeLimit => 'App time limit',
        RuleType.screenTimeLimit => 'Screen time limit',
        RuleType.bedtime => 'Bedtime schedule',
        RuleType.contentFilter => 'Content filter',
        RuleType.locationGeofence => 'Location geofence',
      };
}

// ─── Models ───────────────────────────────────────────────────────────

DateTime? _dt(dynamic v) => v == null ? null : DateTime.tryParse(v as String);

class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.isActive,
    this.lastLoginAt,
  });

  factory AppUser.fromMap(Map<String, dynamic> m) => AppUser(
        id: m['id'] as String,
        email: (m['email'] ?? '') as String,
        name: (m['name'] ?? 'User') as String,
        role: (m['role'] ?? 'VIEWER') as String,
        isActive: (m['is_active'] ?? true) as bool,
        lastLoginAt: _dt(m['last_login_at']),
      );
  final String id;
  final String email;
  final String name;
  final String role;
  final bool isActive;
  final DateTime? lastLoginAt;

  bool get canControl => role == 'ADMIN' || role == 'OPERATOR';
}

class Device {
  const Device({
    required this.id,
    required this.deviceId,
    required this.name,
    required this.type,
    required this.room,
    required this.status,
    required this.battery,
    required this.signal,
    required this.lastSeenAt,
    this.ipAddress,
    this.firmware,
  });

  factory Device.fromMap(Map<String, dynamic> m) => Device(
        id: m['id'] as String,
        deviceId: (m['device_id'] ?? '') as String,
        name: (m['name'] ?? 'Device') as String,
        type: DeviceType.fromName(m['type'] as String?),
        room: (m['room'] ?? '—') as String,
        status: DeviceStatusX.fromName(m['status'] as String?),
        battery: (m['battery'] ?? 0) as int,
        signal: (m['signal'] ?? -60) as int,
        lastSeenAt: _dt(m['last_seen_at']),
        ipAddress: m['ip_address'] as String?,
        firmware: m['firmware'] as String?,
      );
  final String id;
  final String deviceId;
  final String name;
  final DeviceType type;
  final String room;
  final DeviceStatus status;
  final int battery;
  final int signal;
  final DateTime? lastSeenAt;
  final String? ipAddress;
  final String? firmware;

  bool get isReachable => status == DeviceStatus.online || status == DeviceStatus.charging;
  bool get isComputer => type == DeviceType.laptop || type == DeviceType.display;
}

class DeviceApp {
  const DeviceApp({
    required this.id,
    required this.deviceId,
    required this.packageName,
    required this.appName,
    required this.category,
    required this.isBlocked,
    this.dailyLimitMin,
  });

  factory DeviceApp.fromMap(Map<String, dynamic> m) => DeviceApp(
        id: m['id'] as String,
        deviceId: (m['device_id'] ?? '') as String,
        packageName: (m['package_name'] ?? '') as String,
        appName: (m['app_name'] ?? m['package_name'] ?? 'App') as String,
        category: (m['category'] ?? 'Other') as String,
        isBlocked: (m['is_blocked'] ?? false) as bool,
        dailyLimitMin: m['daily_limit_min'] as int?,
      );
  final String id;
  final String deviceId;
  final String packageName;
  final String appName;
  final String category;
  final bool isBlocked;
  final int? dailyLimitMin;
}

class DeviceCommand {
  const DeviceCommand({
    required this.id,
    required this.deviceId,
    required this.type,
    required this.status,
    required this.sentBy,
    required this.sentAt,
    this.payload,
    this.result,
    this.executedAt,
  });

  factory DeviceCommand.fromMap(Map<String, dynamic> m) => DeviceCommand(
        id: m['id'] as String,
        deviceId: (m['device_id'] ?? '') as String,
        type: (m['type'] ?? '') as String,
        status: CommandStatusX.fromName(m['status'] as String?),
        sentBy: (m['sent_by'] ?? '') as String,
        sentAt: _dt(m['sent_at']),
        payload: m['payload'] as Map<String, dynamic>?,
        result: m['result'] as Map<String, dynamic>?,
        executedAt: _dt(m['executed_at']),
      );
  final String id;
  final String deviceId;
  final String type;
  final CommandStatus status;
  final String sentBy;
  final DateTime? sentAt;
  final Map<String, dynamic>? payload;
  final Map<String, dynamic>? result;
  final DateTime? executedAt;
}

class SecurityAlert {
  const SecurityAlert({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.status,
    required this.triggeredAt,
    this.deviceId,
    this.metadata,
  });

  factory SecurityAlert.fromMap(Map<String, dynamic> m) => SecurityAlert(
        id: m['id'] as String,
        title: (m['title'] ?? '') as String,
        description: (m['description'] ?? '') as String,
        severity: AlertSeverityX.fromName(m['severity'] as String?),
        status: AlertStatusX.fromName(m['status'] as String?),
        triggeredAt: _dt(m['triggered_at']),
        deviceId: m['device_id'] as String?,
        metadata: m['metadata'] as Map<String, dynamic>?,
      );
  final String id;
  final String title;
  final String description;
  final AlertSeverity severity;
  final AlertStatus status;
  final DateTime? triggeredAt;
  final String? deviceId;
  final Map<String, dynamic>? metadata;

  bool get isOpen => status == AlertStatus.open;
}

class LocationPing {
  const LocationPing({
    required this.id,
    required this.deviceId,
    required this.latitude,
    required this.longitude,
    required this.recordedAt,
    this.accuracy,
    this.speed,
    this.heading,
    this.address,
    this.battery,
  });

  factory LocationPing.fromMap(Map<String, dynamic> m) => LocationPing(
        id: m['id'] as String,
        deviceId: (m['device_id'] ?? '') as String,
        latitude: (m['latitude'] ?? 0) as num,
        longitude: (m['longitude'] ?? 0) as num,
        accuracy: m['accuracy'] as num?,
        speed: m['speed'] as num?,
        heading: m['heading'] as num?,
        address: m['address'] as String?,
        battery: m['battery'] as int?,
        recordedAt: _dt(m['recorded_at']) ?? DateTime.now(),
      );
  final String id;
  final String deviceId;
  final num latitude;
  final num longitude;
  final num? accuracy;
  final num? speed;
  final num? heading;
  final String? address;
  final int? battery;
  final DateTime? recordedAt;
}

class ScreenTimeSession {
  const ScreenTimeSession({
    required this.id,
    required this.deviceId,
    required this.appPackage,
    required this.appName,
    required this.startedAt,
    this.endedAt,
    this.durationSec,
  });

  factory ScreenTimeSession.fromMap(Map<String, dynamic> m) => ScreenTimeSession(
        id: m['id'] as String,
        deviceId: (m['device_id'] ?? '') as String,
        appPackage: (m['app_package'] ?? '') as String,
        appName: (m['app_name'] ?? '') as String,
        startedAt: _dt(m['started_at']),
        endedAt: _dt(m['ended_at']),
        durationSec: m['duration_sec'] as int?,
      );
  final String id;
  final String deviceId;
  final String appPackage;
  final String appName;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final int? durationSec;
}

class WebHistoryItem {
  const WebHistoryItem({
    required this.id,
    required this.deviceId,
    required this.url,
    required this.visitedAt,
    required this.isBlocked,
    this.title,
    this.category,
  });

  factory WebHistoryItem.fromMap(Map<String, dynamic> m) => WebHistoryItem(
        id: m['id'] as String,
        deviceId: (m['device_id'] ?? '') as String,
        url: (m['url'] ?? '') as String,
        title: m['title'] as String?,
        category: m['category'] as String?,
        isBlocked: (m['is_blocked'] ?? false) as bool,
        visitedAt: _dt(m['visited_at']),
      );
  final String id;
  final String deviceId;
  final String url;
  final String? title;
  final String? category;
  final bool isBlocked;
  final DateTime? visitedAt;
}

class ParentalRule {
  const ParentalRule({
    required this.id,
    required this.deviceId,
    required this.type,
    required this.config,
    required this.isActive,
    required this.createdAt,
  });

  factory ParentalRule.fromMap(Map<String, dynamic> m) => ParentalRule(
        id: m['id'] as String,
        deviceId: (m['device_id'] ?? '') as String,
        type: RuleType.fromName(m['type'] as String?),
        config: (m['config'] ?? const {}) as Map<String, dynamic>,
        isActive: (m['is_active'] ?? true) as bool,
        createdAt: _dt(m['created_at']),
      );
  final String id;
  final String deviceId;
  final RuleType type;
  final Map<String, dynamic> config;
  final bool isActive;
  final DateTime? createdAt;
}

class VoiceCommand {
  const VoiceCommand({
    required this.id,
    required this.transcript,
    required this.intent,
    required this.confidence,
    required this.status,
    required this.deviceId,
    required this.issuedAt,
  });

  factory VoiceCommand.fromMap(Map<String, dynamic> m) => VoiceCommand(
        id: m['id'] as String,
        transcript: (m['transcript'] ?? '') as String,
        intent: (m['intent'] ?? '') as String,
        confidence: (m['confidence'] ?? 0) as num,
        status: (m['status'] ?? 'SUCCESS') as String,
        deviceId: (m['device_id'] ?? '') as String,
        issuedAt: _dt(m['issued_at']),
      );
  final String id;
  final String transcript;
  final String intent;
  final num confidence;
  final String status;
  final String deviceId;
  final DateTime? issuedAt;
}

class DevicePairing {
  const DevicePairing({
    required this.id,
    required this.code,
    required this.shortCode,
    required this.parentId,
    required this.status,
    required this.expiresAt,
    this.deviceId,
    this.pairedAt,
  });

  factory DevicePairing.fromMap(Map<String, dynamic> m) => DevicePairing(
        id: m['id'] as String,
        code: (m['code'] ?? '') as String,
        shortCode: (m['short_code'] ?? '') as String,
        parentId: (m['parent_id'] ?? '') as String,
        status: PairingStatusX.fromName(m['status'] as String?),
        expiresAt: _dt(m['expires_at']),
        deviceId: m['device_id'] as String?,
        pairedAt: _dt(m['paired_at']),
      );
  final String id;
  final String code;
  final String shortCode;
  final String parentId;
  final PairingStatus status;
  final DateTime? expiresAt;
  final String? deviceId;
  final DateTime? pairedAt;
}
