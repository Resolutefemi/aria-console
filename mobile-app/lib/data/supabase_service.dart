import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/models.dart';

/// Central data access layer for Aria Console mobile.
///
/// Talks directly to Supabase with the user's JWT (RLS enforced
/// server-side) — the same database the web console uses, so every
/// change made here shows up on the web and vice versa in realtime.
class SupabaseService {
  SupabaseService._();
  static final SupabaseService instance = SupabaseService._();

  /// Where the web console lives — used for the confirmation-free
  /// sign-up endpoint that matches the web flow (no email step).
  static const webOrigin = String.fromEnvironment(
    'ARIA_WEB_ORIGIN',
    defaultValue: 'https://aria-console.vercel.app',
  );

  SupabaseClient get _db => Supabase.instance.client;

  // ─── Auth ───────────────────────────────────────────────────────────

  User? get authUser => _db.auth.currentUser;

  /// Confirmation-free registration: reuses the web console's signup
  /// endpoint (Admin API, `email_confirm: true` — no email step) and
  /// then signs in locally to mint a Supabase session.
  /// Returns an error message or null on success.
  Future<String?> signUp({
    required String email,
    required String password,
    String? name,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$webOrigin/api/auth/signup'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password, 'name': name}),
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode >= 400 || data['error'] != null) {
        final err = data['error'];
        return err is String && err.isNotEmpty
            ? err
            : 'Could not create the account.';
      }
    } catch (_) {
      // Web console unreachable — fall back to direct Supabase sign-up.
      return _directSignUp(email, password, name);
    }
    return signIn(email: email, password: password);
  }

  Future<String?> _directSignUp(
    String email,
    String password,
    String? name,
  ) async {
    try {
      final res = await _db.auth.signUp(
        email: email,
        password: password,
        data: name == null ? null : {'name': name},
      );
      if (res.session == null) {
        return 'Email confirmation is enabled for this project. '
            'Confirm via the link, then sign in.';
      }
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      return 'Sign-up failed: $e';
    }
  }

  Future<String?> signIn({required String email, required String password}) async {
    try {
      await _db.auth.signInWithPassword(email: email, password: password);
      return null;
    } on AuthException catch (e) {
      if (e.message.toLowerCase().contains('invalid login')) {
        return 'Wrong email or password.';
      }
      if (e.message.toLowerCase().contains('not confirmed')) {
        return 'Email not confirmed yet. Check your inbox.';
      }
      return e.message;
    } catch (e) {
      return 'Could not reach the sign-in service: $e';
    }
  }

  Future<void> signOut() => _db.auth.signOut();

  /// The signed-in parent's profile row from `public.users`.
  Future<AppUser?> fetchProfile() async {
    final uid = authUser?.id;
    if (uid == null) return null;
    try {
      final row = await _db.from('users').select().eq('id', uid).maybeSingle();
      return row == null ? null : AppUser.fromMap(row);
    } catch (_) {
      return null;
    }
  }

  // ─── Devices ────────────────────────────────────────────────────────

  Future<List<Device>> fetchDevices() async {
    final rows = await _db
        .from('devices')
        .select()
        .order('last_seen_at', ascending: false);
    return rows.map(Device.fromMap).toList();
  }

  Future<Device?> fetchDevice(String id) async {
    final row = await _db.from('devices').select().eq('id', id).maybeSingle();
    return row == null ? null : Device.fromMap(row);
  }

  // ─── Apps ───────────────────────────────────────────────────────────

  Future<List<DeviceApp>> fetchApps(String deviceId) async {
    final rows = await _db
        .from('device_apps')
        .select()
        .eq('device_id', deviceId)
        .order('app_name');
    return rows.map(DeviceApp.fromMap).toList();
  }

  Future<void> setAppBlocked({
    required DeviceApp app,
    required bool blocked,
  }) async {
    await _db
        .from('device_apps')
        .update({'is_blocked': blocked})
        .eq('id', app.id);
    await sendCommand(
      app.deviceId,
      blocked ? 'BLOCK_APP' : 'UNBLOCK_APP',
      payload: {'package': app.packageName, 'app_name': app.appName},
    );
  }

  Future<void> setAppDailyLimit({
    required DeviceApp app,
    required int? minutes,
  }) async {
    await _db
        .from('device_apps')
        .update({'daily_limit_min': minutes})
        .eq('id', app.id);
    if (minutes != null) {
      await sendCommand(
        app.deviceId,
        'SET_TIME_LIMIT',
        payload: {'package': app.packageName, 'limit_min': minutes},
      );
    }
  }

  // ─── Commands ───────────────────────────────────────────────────────

  Future<DeviceCommand> sendCommand(
    String deviceId,
    String type, {
    Map<String, dynamic>? payload,
  }) async {
    final uid = authUser?.id ?? '';
    final row = await _db
        .from('device_commands')
        .insert({
          'device_id': deviceId,
          'type': type,
          'payload': payload,
          'sent_by': uid,
        })
        .select()
        .single();
    return DeviceCommand.fromMap(row);
  }

  Future<List<DeviceCommand>> fetchCommands(String deviceId, {int limit = 50}) async {
    final rows = await _db
        .from('device_commands')
        .select()
        .eq('device_id', deviceId)
        .order('sent_at', ascending: false)
        .limit(limit);
    return rows.map(DeviceCommand.fromMap).toList();
  }

  // ─── Alerts ─────────────────────────────────────────────────────────

  Future<List<SecurityAlert>> fetchAlerts() async {
    final rows = await _db
        .from('security_alerts')
        .select()
        .order('triggered_at', ascending: false)
        .limit(100);
    return rows.map(SecurityAlert.fromMap).toList();
  }

  Future<void> updateAlertStatus(String alertId, String status) async {
    await _db.from('security_alerts').update({
      'status': status,
      'acknowledged_at': DateTime.now().toUtc().toIso8601String(),
      'acknowledged_by': authUser?.id,
    }).eq('id', alertId);
  }

  // ─── Location ───────────────────────────────────────────────────────

  Future<List<LocationPing>> fetchLocationPings(String deviceId, {int limit = 30}) async {
    final rows = await _db
        .from('location_pings')
        .select()
        .eq('device_id', deviceId)
        .order('recorded_at', ascending: false)
        .limit(limit);
    return rows.map(LocationPing.fromMap).toList();
  }

  // ─── Screen time ────────────────────────────────────────────────────

  Future<List<ScreenTimeSession>> fetchScreenTime(String deviceId, {int days = 7}) async {
    final since = DateTime.now().subtract(Duration(days: days));
    final rows = await _db
        .from('screen_time_sessions')
        .select()
        .eq('device_id', deviceId)
        .gte('started_at', since.toUtc().toIso8601String())
        .order('started_at', ascending: false)
        .limit(500);
    return rows.map(ScreenTimeSession.fromMap).toList();
  }

  // ─── Web history ────────────────────────────────────────────────────

  Future<List<WebHistoryItem>> fetchWebHistory(String deviceId, {int limit = 100}) async {
    final rows = await _db
        .from('web_history')
        .select()
        .eq('device_id', deviceId)
        .order('visited_at', ascending: false)
        .limit(limit);
    return rows.map(WebHistoryItem.fromMap).toList();
  }

  // ─── Rules ──────────────────────────────────────────────────────────

  Future<List<ParentalRule>> fetchRules(String deviceId) async {
    final rows = await _db
        .from('parental_rules')
        .select()
        .eq('device_id', deviceId)
        .order('created_at', ascending: false);
    return rows.map(ParentalRule.fromMap).toList();
  }

  Future<ParentalRule> addRule({
    required String deviceId,
    required RuleType type,
    required Map<String, dynamic> config,
  }) async {
    final row = await _db.from('parental_rules').insert({
      'device_id': deviceId,
      'type': type.dbName,
      'config': config,
      'is_active': true,
      'created_by': authUser?.id,
    }).select().single();
    return ParentalRule.fromMap(row);
  }

  Future<void> setRuleActive(String ruleId, bool active) async {
    await _db.from('parental_rules').update({'is_active': active}).eq('id', ruleId);
  }

  Future<void> deleteRule(String ruleId) async {
    await _db.from('parental_rules').delete().eq('id', ruleId);
  }

  // ─── Voice commands ─────────────────────────────────────────────────

  Future<List<VoiceCommand>> fetchVoiceCommands(String deviceId, {int limit = 40}) async {
    final rows = await _db
        .from('voice_commands')
        .select()
        .eq('device_id', deviceId)
        .order('issued_at', ascending: false)
        .limit(limit);
    return rows.map(VoiceCommand.fromMap).toList();
  }

  // ─── Pairing ────────────────────────────────────────────────────────

  Future<DevicePairing> createPairing({
    required String deviceName,
    required String deviceType,
  }) async {
    final uid = authUser?.id ?? '';
    final shortCode = (100000 + DateTime.now().microsecondsSinceEpoch % 900000).toString();
    final row = await _db.from('device_pairings').insert({
      'code': shortCode,
      'short_code': shortCode,
      'parent_id': uid,
      'status': 'PENDING',
      'expires_at': DateTime.now()
          .toUtc()
          .add(const Duration(minutes: 15))
          .toIso8601String(),
    }).select().single();
    // Persist the requested name/type into the pairing payload is not
    // supported by the schema; the agent asks for these during pairing.
    return DevicePairing.fromMap(row);
  }

  /// Realtime: fires when the pairing row transitions to PAIRED.
  RealtimeChannel watchPairing(String pairingId, void Function() onPaired) {
    final channel = _db.channel('pairing-$pairingId');
    channel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'device_pairings',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'id',
        value: pairingId,
      ),
      callback: (payload) {
        final row = payload.newRecord;
        if ((row['status'] as String?)?.toUpperCase() == 'PAIRED') onPaired();
      },
    ).subscribe();
    return channel;
  }

  // ─── Realtime: global alert + command streams ───────────────────────

  RealtimeChannel watchAlerts({
    required void Function(SecurityAlert) onInsert,
    required VoidCallbackX onUpdate,
  }) {
    final channel = _db.channel('mobile-alerts');
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'security_alerts',
          callback: (p) => onInsert(SecurityAlert.fromMap(p.newRecord)),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'security_alerts',
          callback: (_) => onUpdate(),
        )
        .subscribe();
    return channel;
  }

  RealtimeChannel watchCommands(void Function(DeviceCommand) onChange) {
    final channel = _db.channel('mobile-commands');
    channel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'device_commands',
      callback: (p) => onChange(DeviceCommand.fromMap(p.newRecord)),
    ).subscribe();
    return channel;
  }

  Future<void> removeChannel(RealtimeChannel channel) async {
    try {
      await _db.removeChannel(channel);
    } catch (_) {
      // best effort
    }
  }
}

/// Simple alias so the service file doesn't import flutter for void cb.
typedef VoidCallbackX = void Function();
