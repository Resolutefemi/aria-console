import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/models.dart';
import '../data/supabase_service.dart';

/// Global app state: auth session, theme mode, devices, alerts and the
/// realtime wiring that keeps everything live.
class AppState extends ChangeNotifier {
  final _service = SupabaseService.instance;

  // ── Auth ──
  User? authUser;
  AppUser? profile;
  bool authReady = false;
  bool controlling = false; // role >= OPERATOR

  // ── Data ──
  List<Device> devices = [];
  List<SecurityAlert> alerts = [];
  bool devicesLoading = false;
  bool alertsLoading = false;
  String? lastError;

  // ── Theme ──
  ThemeMode themeMode = ThemeMode.system;

  RealtimeChannel? _alertsChannel;
  RealtimeChannel? _commandsChannel;
  StreamSubscription<AuthState>? _authSub;
  DateTime? _lastAlertPing;

  AppState() {
    _loadTheme();
    _authSub = Supabase.instance.client.auth.onAuthStateChange.listen((state) {
      final signedIn = state.session != null;
      final changed = signedIn != (authUser != null);
      authUser = state.session?.user;
      if (signedIn) {
        _loadProfile();
        refreshDevices();
        refreshAlerts();
        _startRealtime();
      } else {
        profile = null;
        devices = [];
        alerts = [];
        _stopRealtime();
      }
      if (changed) notifyListeners();
    });
    authUser = Supabase.instance.client.auth.currentUser;
    if (authUser != null) {
      _loadProfile();
      refreshDevices();
      refreshAlerts();
      _startRealtime();
    } else {
      authReady = true;
    }
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('aria_theme_mode') ?? 'system';
    themeMode = switch (saved) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('aria_theme_mode', switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      _ => 'system',
    });
    notifyListeners();
  }

  Future<void> _loadProfile() async {
    profile = await _service.fetchProfile();
    controlling = profile?.canControl ?? false;
    authReady = true;
    notifyListeners();
  }

  // ── Data refresh ────────────────────────────────────────────────────

  Future<void> refreshDevices() async {
    if (authUser == null) return;
    devicesLoading = true;
    notifyListeners();
    try {
      devices = await _service.fetchDevices();
      lastError = null;
    } catch (e) {
      lastError = e.toString();
    } finally {
      devicesLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshAlerts() async {
    if (authUser == null) return;
    alertsLoading = true;
    notifyListeners();
    try {
      alerts = await _service.fetchAlerts();
      lastError = null;
    } catch (e) {
      lastError = e.toString();
    } finally {
      alertsLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshAll() async {
    await Future.wait([refreshDevices(), refreshAlerts()]);
  }

  Device? deviceById(String? id) {
    if (id == null) return null;
    for (final d in devices) {
      if (d.id == id) return d;
    }
    return null;
  }

  List<SecurityAlert> get openAlerts =>
      alerts.where((a) => a.isOpen).toList();

  int onlineCount() =>
      devices.where((d) => d.isReachable).length;

  // ── Realtime ────────────────────────────────────────────────────────

  void _startRealtime() {
    if (_alertsChannel != null) return;
    _alertsChannel = _service.watchAlerts(
      onInsert: (alert) {
        alerts = [alert, ...alerts];
        _lastAlertPing = DateTime.now();
        notifyListeners();
      },
      onUpdate: () {
        refreshAlerts();
      },
    );
    _commandsChannel = _service.watchCommands((cmd) {
      if (cmd.status == CommandStatus.executed) {
        // Command executed on the device — refresh views that care.
        notifyListeners();
      }
    });
  }

  void _stopRealtime() {
    final a = _alertsChannel;
    final c = _commandsChannel;
    _alertsChannel = null;
    _commandsChannel = null;
    if (a != null) unawaited(_service.removeChannel(a));
    if (c != null) unawaited(_service.removeChannel(c));
  }

  DateTime? get lastAlertPing => _lastAlertPing;

  @override
  void dispose() {
    _authSub?.cancel();
    _stopRealtime();
    super.dispose();
  }
}
