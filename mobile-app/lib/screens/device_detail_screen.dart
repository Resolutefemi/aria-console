import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../core/utils.dart';
import '../data/models.dart';
import '../data/supabase_service.dart';
import '../widgets/common.dart';
import '../widgets/screen_time_chart.dart';

/// Full control surface for one device — the mobile equivalent of the
/// web console's device page (and the FlashGet Kids parent toolkit).
class DeviceDetailScreen extends StatefulWidget {
  const DeviceDetailScreen({super.key, required this.deviceId});
  final String deviceId;

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen> {
  Device? _device;

  @override
  void initState() {
    super.initState();
    _loadDevice();
  }

  Future<void> _loadDevice() async {
    final d = await SupabaseService.instance.fetchDevice(widget.deviceId);
    if (mounted) setState(() => _device = d);
  }

  @override
  Widget build(BuildContext context) {
    final device = _device;
    if (device == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Device')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    return DefaultTabController(
      length: 6,
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              StatusDot(status: device.status),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  device.name,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.startOffset,
            tabs: [
              Tab(text: 'Overview', icon: Icon(Icons.dashboard_rounded, size: 18)),
              Tab(text: 'Apps', icon: Icon(Icons.apps_rounded, size: 18)),
              Tab(text: 'Location', icon: Icon(Icons.location_on_rounded, size: 18)),
              Tab(text: 'Screen time', icon: Icon(Icons.hourglass_bottom_rounded, size: 18)),
              Tab(text: 'Web', icon: Icon(Icons.language_rounded, size: 18)),
              Tab(text: 'Rules', icon: Icon(Icons.rule_rounded, size: 18)),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _OverviewTab(device: device, onChanged: _loadDevice),
            _AppsTab(device: device),
            _LocationTab(device: device),
            _ScreenTimeTab(device: device),
            _WebTab(device: device),
            _RulesTab(device: device),
          ],
        ),
      ),
    );
  }
}

// ═════════════════════════════ OVERVIEW ═══════════════════════════════

class _OverviewTab extends StatefulWidget {
  const _OverviewTab({required this.device, required this.onChanged});
  final Device device;
  final VoidCallback onChanged;

  @override
  State<_OverviewTab> createState() => _OverviewTabState();
}

class _OverviewTabState extends State<_OverviewTab> {
  List<DeviceCommand> _commands = [];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _loadCommands();
  }

  Future<void> _loadCommands() async {
    final cmds = await SupabaseService.instance
        .fetchCommands(widget.device.id, limit: 12);
    if (mounted) setState(() => _commands = cmds);
  }

  Future<void> _send(String type, {Map<String, dynamic>? payload, String? confirm}) async {
    final theme = Theme.of(context);
    if (confirm != null) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(commandLabel(type)),
          content: Text(confirm),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Continue')),
          ],
        ),
      );
      if (ok != true) return;
    }
    setState(() => _sending = true);
    try {
      await SupabaseService.instance.sendCommand(widget.device.id, type, payload: payload);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${commandLabel(type)} sent to ${widget.device.name}'),
            backgroundColor: theme.colorScheme.primary,
          ),
        );
      }
      await _loadCommands();
      widget.onChanged();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _sendMessage() async {
    final controller = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send message'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Message shown on the device…',
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, controller.text),
              child: const Text('Send')),
        ],
      ),
    );
    if (text != null && text.trim().isNotEmpty) {
      await _send('SEND_MESSAGE', payload: {'text': text.trim()});
    }
  }

  @override
  Widget build(BuildContext context) {
    final device = widget.device;
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Status card ──
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withAlpha(22),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        deviceTypeIcon(device.type),
                        color: theme.colorScheme.primary,
                        size: 26,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(device.name, style: theme.textTheme.titleLarge),
                          Text(
                            '${device.room} · ${device.ipAddress ?? 'no IP'}',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    StatusDot(status: device.status, size: 11),
                  ],
                ),
                const Divider(height: 26),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _info(theme, Icons.battery_5_bar_rounded, '${device.battery}%', 'Battery'),
                    _info(theme, Icons.wifi_rounded, '${device.signal} dBm', 'Signal'),
                    _info(theme, Icons.schedule_rounded, timeAgo(device.lastSeenAt), 'Last seen'),
                    _info(theme, Icons.memory_rounded, device.firmware ?? '—', 'Firmware'),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        const SectionHeader('Quick actions'),
        GridView.count(
          crossAxisCount: 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 0.92,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: [
            ActionTile(
              icon: Icons.lock_rounded,
              label: 'Lock',
              onTap: () => _send('LOCK_DEVICE', confirm: 'Lock ${device.name} now?'),
            ),
            ActionTile(
              icon: Icons.lock_open_rounded,
              label: 'Unlock',
              onTap: () => _send('UNLOCK_DEVICE'),
            ),
            ActionTile(
              icon: Icons.notifications_active_rounded,
              label: 'Ring',
              onTap: () => _send('RING_DEVICE', payload: {'seconds': 15}),
            ),
            ActionTile(
              icon: Icons.screenshot_monitor_rounded,
              label: 'Screenshot',
              onTap: () => _send('REQUEST_SCREENSHOT'),
            ),
            ActionTile(
              icon: Icons.location_searching_rounded,
              label: 'Locate now',
              onTap: () => _send('REQUEST_LOCATION'),
            ),
            ActionTile(
              icon: Icons.chat_rounded,
              label: 'Message',
              onTap: _sendMessage,
            ),
            ActionTile(
              icon: Icons.pause_presentation_rounded,
              label: 'Pause',
              onTap: () => _send('SET_BRIGHTNESS', payload: {'brightness': 0},
                  confirm: 'Pause the screen by turning brightness to 0%?'),
            ),
            ActionTile(
              icon: Icons.block_rounded,
              label: 'Internet off',
              onTap: () => _send('TURN_OFF',
                  confirm: 'Turn connectivity off on ${device.name}?'),
            ),
          ],
        ),
        if (_sending)
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Center(child: SizedBox(
              width: 18, height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )),
          ),
        const SizedBox(height: 20),
        SectionHeader(
          'Recent commands',
          action: Text(
            'tap to refresh',
            style: theme.textTheme.labelSmall,
          ),
        ),
        ..._commands.map(
          (c) => Card(
            child: ListTile(
              onTap: _loadCommands,
              dense: true,
              leading: Icon(
                commandIcon(c.type),
                size: 20,
                color: theme.colorScheme.primary,
              ),
              title: Text(commandLabel(c.type), style: theme.textTheme.titleMedium),
              subtitle: Text(timeAgo(c.sentAt), style: theme.textTheme.bodySmall),
              trailing: CommandStatusChip(status: c.status),
            ),
          ),
        ),
        if (_commands.isEmpty)
          const EmptyState(
            icon: Icons.settings_remote_rounded,
            title: 'No commands yet',
            subtitle: 'Actions you take show up here with their status.',
          ),
      ],
    );
  }

  Widget _info(ThemeData theme, IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, size: 17, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(fontSize: 13),
        ),
        Text(label, style: theme.textTheme.labelSmall),
      ],
    );
  }
}

// ═════════════════════════════ APPS ═══════════════════════════════════

class _AppsTab extends StatefulWidget {
  const _AppsTab({required this.device});
  final Device device;

  @override
  State<_AppsTab> createState() => _AppsTabState();
}

class _AppsTabState extends State<_AppsTab> {
  List<DeviceApp> _apps = [];
  Map<String, int> _usage = {}; // package -> seconds today
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final apps = await SupabaseService.instance.fetchApps(widget.device.id);
    final sessions = await SupabaseService.instance.fetchScreenTime(widget.device.id, days: 1);
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final usage = <String, int>{};
    for (final s in sessions) {
      if (s.startedAt == null || s.startedAt!.isBefore(todayStart)) continue;
      usage[s.appPackage] = (usage[s.appPackage] ?? 0) + (s.durationSec ?? 0);
    }
    if (mounted) {
      setState(() {
        _apps = apps;
        _usage = usage;
        _loading = false;
      });
    }
  }

  Future<void> _toggleBlock(DeviceApp app) async {
    await SupabaseService.instance.setAppBlocked(app: app, blocked: !app.isBlocked);
    await _load();
  }

  Future<void> _setLimit(DeviceApp app) async {
    final controller = TextEditingController(
      text: app.dailyLimitMin?.toString() ?? '',
    );
    final mins = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Daily limit — ${app.appName}'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Minutes per day',
            hintText: 'Leave empty for no limit',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () =>
                Navigator.pop(ctx, int.tryParse(controller.text.trim())),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (mins != null) {
      await SupabaseService.instance.setAppDailyLimit(app: app, minutes: mins);
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_apps.isEmpty) {
      return const EmptyState(
        icon: Icons.apps_rounded,
        title: 'No app inventory',
        subtitle:
            'The companion agent reports installed apps automatically once '
            'the device is online.',
      );
    }
    return RefreshIndicator(
      color: theme.colorScheme.primary,
      onRefresh: _load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: _apps.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final app = _apps[i];
          final used = _usage[app.packageName] ?? 0;
          final limit = app.dailyLimitMin;
          final overLimit = limit != null && used > limit * 60;
          return Card(
            child: ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withAlpha(20),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(Icons.widgets_rounded,
                    size: 20, color: theme.colorScheme.primary),
              ),
              title: Text(
                app.appName,
                style: theme.textTheme.titleMedium?.copyWith(fontSize: 14.5),
              ),
              subtitle: Text(
                limit == null
                    ? '${app.category} · ${durationLabel(used)} today'
                    : '${app.category} · ${durationLabel(used)} / ${durationLabel(limit * 60)}'
                      '${overLimit ? ' — over limit!' : ''}',
                style: TextStyle(
                  color: overLimit ? theme.colorScheme.error : null,
                ),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    tooltip: 'Daily limit',
                    icon: const Icon(Icons.timer_outlined, size: 20),
                    onPressed: () => _setLimit(app),
                  ),
                  Switch(
                    value: app.isBlocked,
                    onChanged: (_) => _toggleBlock(app),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ═════════════════════════════ LOCATION ═══════════════════════════════

class _LocationTab extends StatefulWidget {
  const _LocationTab({required this.device});
  final Device device;

  @override
  State<_LocationTab> createState() => _LocationTabState();
}

class _LocationTabState extends State<_LocationTab> {
  List<LocationPing> _pings = [];
  final bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final pings = await SupabaseService.instance
        .fetchLocationPings(widget.device.id);
    if (mounted) setState(() => _pings = pings);
  }

  Future<void> _requestNow() async {
    final theme = Theme.of(context);
    try {
      await SupabaseService.instance
          .sendCommand(widget.device.id, 'REQUEST_LOCATION');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Location request sent — the device will '
                'report its position shortly.'),
            backgroundColor: theme.colorScheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    final latest = _pings.isEmpty ? null : _pings.first;
    final center = latest == null
        ? const LatLng(6.5244, 3.3792) // Lagos fallback
        : LatLng(latest.latitude.toDouble(), latest.longitude.toDouble());

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          clipBehavior: Clip.antiAlias,
          child: SizedBox(
            height: 260,
            child: Stack(
              children: [
                FlutterMap(
                  options: MapOptions(
                    initialCenter: center,
                    initialZoom: latest == null ? 3 : 14,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all,
                    ),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'dev.ariaconsole.mobile',
                    ),
                    if (latest != null)
                      CircleLayer(
                        circles: [
                          CircleMarker(
                            point: LatLng(latest.latitude.toDouble(),
                                latest.longitude.toDouble()),
                            radius: (latest.accuracy ?? 30).toDouble(),
                            useRadiusInMeter: true,
                            color: theme.colorScheme.primary.withAlpha(50),
                            borderColor: theme.colorScheme.primary,
                            borderStrokeWidth: 1.5,
                          ),
                        ],
                      ),
                    if (latest != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(latest.latitude.toDouble(),
                                latest.longitude.toDouble()),
                            width: 40,
                            height: 40,
                            child: Icon(
                              Icons.location_on_rounded,
                              size: 36,
                              color: theme.colorScheme.primary,
                              shadows: const [
                                Shadow(blurRadius: 8, color: Colors.black38),
                              ],
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                Positioned(
                  bottom: 6,
                  right: 8,
                  child: Text(
                    '© OpenStreetMap contributors',
                    style: TextStyle(
                      fontSize: 9,
                      color: Colors.black54,
                      backgroundColor: Colors.white.withAlpha(200),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: _requestNow,
          icon: const Icon(Icons.location_searching_rounded),
          label: const Text('Request location now'),
        ),
        const SizedBox(height: 18),
        if (latest != null) ...[
          const SectionHeader('Latest position'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    latest.address ??
                        '${latest.latitude.toStringAsFixed(5)}, '
                            '${latest.longitude.toStringAsFixed(5)}',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${timeAgo(latest.recordedAt)}'
                    '${latest.accuracy != null ? ' · ±${latest.accuracy!.toStringAsFixed(0)}m' : ''}'
                    '${latest.battery != null ? ' · ${latest.battery}% battery' : ''}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 18),
        const SectionHeader('Location history'),
        ..._pings.take(20).map(
              (p) => Card(
                child: ListTile(
                  dense: true,
                  leading: Icon(Icons.place_rounded,
                      size: 19, color: theme.colorScheme.primary),
                  title: Text(
                    p.address ??
                        '${p.latitude.toStringAsFixed(4)}, ${p.longitude.toStringAsFixed(4)}',
                    style: theme.textTheme.titleMedium?.copyWith(fontSize: 13.5),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    DateFormat('MMM d, HH:mm')
                        .format(p.recordedAt?.toLocal() ?? DateTime.now()),
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ),
            ),
        if (_pings.isEmpty)
          const EmptyState(
            icon: Icons.location_off_rounded,
            title: 'No location data',
            subtitle:
                'Once the device reports a position it appears here — you '
                'can also request one right now.',
          ),
      ],
    );
  }
}

// ═════════════════════════════ SCREEN TIME ════════════════════════════

class _ScreenTimeTab extends StatefulWidget {
  const _ScreenTimeTab({required this.device});
  final Device device;

  @override
  State<_ScreenTimeTab> createState() => _ScreenTimeTabState();
}

class _ScreenTimeTabState extends State<_ScreenTimeTab> {
  List<ScreenTimeSession> _sessions = [];
  final bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sessions = await SupabaseService.instance
        .fetchScreenTime(widget.device.id, days: 7);
    if (mounted) setState(() => _sessions = sessions);
  }

  Future<void> _addScreenTimeRule() async {
    final controller = TextEditingController();
    final mins = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Daily screen time limit'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Total minutes per day',
            hintText: 'e.g. 120',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, int.tryParse(controller.text.trim())),
            child: const Text('Create rule'),
          ),
        ],
      ),
    );
    if (mins != null) {
      await SupabaseService.instance.addRule(
        deviceId: widget.device.id,
        type: RuleType.screenTimeLimit,
        config: {'daily_limit_min': mins},
      );
      await SupabaseService.instance.sendCommand(
        widget.device.id,
        'SET_TIME_LIMIT',
        payload: {'limit_min': mins, 'scope': 'total'},
      );
      await _load();
    }
  }

  Future<void> _addBedtimeRule() async {
    TimeOfDay? start = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 21, minute: 30),
      helpText: 'Bedtime starts',
    );
    if (start == null) return;
    if (!mounted) return;
    TimeOfDay? end = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 7, minute: 0),
      helpText: 'Bedtime ends',
    );
    if (end == null) return;
    await SupabaseService.instance.addRule(
      deviceId: widget.device.id,
      type: RuleType.bedtime,
      config: {
        'start': '${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}',
        'end': '${end.hour.toString().padLeft(2, '0')}:${end.minute.toString().padLeft(2, '0')}',
        'days': ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      },
    );
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) return const Center(child: CircularProgressIndicator());

    final midnight = DateTime.now();
    final todayStart = DateTime(midnight.year, midnight.month, midnight.day);
    final todayTotal = _sessions
        .where((s) => s.startedAt != null && s.startedAt!.isAfter(todayStart))
        .fold<int>(0, (sum, s) => sum + (s.durationSec ?? 0));

    // 7-day buckets, oldest → newest
    final daySeconds = List<double>.filled(7, 0);
    final dayLabels = List<String>.generate(7, (i) {
      final d = todayStart.subtract(Duration(days: 6 - i));
      return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.weekday % 7];
    });
    for (final s in _sessions) {
      if (s.startedAt == null) continue;
      final local = s.startedAt!.toLocal();
      final start = DateTime(local.year, local.month, local.day);
      final idx = 6 - todayStart.difference(start).inDays;
      if (idx >= 0 && idx < 7) {
        daySeconds[idx] += (s.durationSec ?? 0).toDouble();
      }
    }

    // per-app today
    final perApp = <String, int>{};
    for (final s in _sessions) {
      if (s.startedAt == null || s.startedAt!.isBefore(todayStart)) continue;
      perApp[s.appName] = (perApp[s.appName] ?? 0) + (s.durationSec ?? 0);
    }
    final appEntries = perApp.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withAlpha(22),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.hourglass_bottom_rounded,
                      color: theme.colorScheme.primary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Today', style: theme.textTheme.labelSmall),
                      Text(
                        durationLabel(todayTotal),
                        style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
                      ),
                    ],
                  ),
                ),
                Text('last 7 days', style: theme.textTheme.labelSmall),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 18, 14, 10),
            child: ScreenTimeBarChart(values: daySeconds, labels: dayLabels),
          ),
        ),
        const SizedBox(height: 18),
        const SectionHeader('Controls'),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _addScreenTimeRule,
                icon: const Icon(Icons.timer_outlined, size: 18),
                label: const Text('Time limit'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _addBedtimeRule,
                icon: const Icon(Icons.bedtime_outlined, size: 18),
                label: const Text('Bedtime'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        const SectionHeader('Top apps today'),
        if (appEntries.isEmpty)
          const EmptyState(
            icon: Icons.hourglass_empty_rounded,
            title: 'No usage recorded',
            subtitle: 'Screen time sessions appear here as the device '
                'reports app usage.',
          )
        else
          ...appEntries.take(8).map(
                (e) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Card(
                    child: ListTile(
                      dense: true,
                      leading: Icon(Icons.widgets_rounded,
                          size: 19, color: theme.colorScheme.primary),
                      title: Text(e.key, style: theme.textTheme.titleMedium?.copyWith(fontSize: 13.5)),
                      trailing: Text(
                        durationLabel(e.value),
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
      ],
    );
  }
}

// ═════════════════════════════ WEB ════════════════════════════════════

class _WebTab extends StatefulWidget {
  const _WebTab({required this.device});
  final Device device;

  @override
  State<_WebTab> createState() => _WebTabState();
}

class _WebTabState extends State<_WebTab> {
  List<WebHistoryItem> _items = [];
  final bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final items = await SupabaseService.instance
        .fetchWebHistory(widget.device.id);
    if (mounted) setState(() => _items = items);
  }

  Future<void> _blockDomain(String domain) async {
    await SupabaseService.instance.addRule(
      deviceId: widget.device.id,
      type: RuleType.contentFilter,
      config: {'blocked_domains': [domain], 'action': 'BLOCK'},
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$domain added to the block list')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    final filtered = _query.isEmpty
        ? _items
        : _items
            .where((w) =>
                w.url.toLowerCase().contains(_query) ||
                (w.title ?? '').toLowerCase().contains(_query))
            .toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            onChanged: (v) => setState(() => _query = v.toLowerCase()),
            decoration: const InputDecoration(
              hintText: 'Search visits…',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const EmptyState(
                  icon: Icons.language_rounded,
                  title: 'No browsing history',
                  subtitle: 'Visited sites from the linked device appear here.',
                )
              : RefreshIndicator(
                  color: theme.colorScheme.primary,
                  onRefresh: _load,
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final item = filtered[i];
                      return Card(
                        child: ListTile(
                          dense: true,
                          leading: Icon(
                            item.isBlocked
                                ? Icons.block_rounded
                                : Icons.language_rounded,
                            size: 19,
                            color: item.isBlocked
                                ? theme.colorScheme.error
                                : theme.colorScheme.primary,
                          ),
                          title: Text(
                            item.title ?? item.url,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(fontSize: 13.5),
                          ),
                          subtitle: Text(
                            '${item.url} · ${timeAgo(item.visitedAt)}'
                            '${item.category != null ? ' · ${item.category}' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall,
                          ),
                          trailing: IconButton(
                            tooltip: 'Block domain',
                            icon: const Icon(Icons.do_not_disturb_on_outlined,
                                size: 20),
                            onPressed: () => _blockDomain(
                              Uri.tryParse(item.url)?.host ?? item.url,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}

// ═════════════════════════════ RULES ══════════════════════════════════

class _RulesTab extends StatefulWidget {
  const _RulesTab({required this.device});
  final Device device;

  @override
  State<_RulesTab> createState() => _RulesTabState();
}

class _RulesTabState extends State<_RulesTab> {
  List<ParentalRule> _rules = [];
  final bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rules = await SupabaseService.instance.fetchRules(widget.device.id);
    if (mounted) setState(() => _rules = rules);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) return const Center(child: CircularProgressIndicator());

    return Stack(
      children: [
        _rules.isEmpty
            ? const EmptyState(
                icon: Icons.rule_rounded,
                title: 'No rules yet',
                subtitle:
                    'Create screen-time limits, bedtimes, app blocks, content '
                    'filters or geofences. Rules apply on the linked device.',
              )
            : RefreshIndicator(
                color: theme.colorScheme.primary,
                onRefresh: _load,
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                  itemCount: _rules.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final rule = _rules[i];
                    return Card(
                      child: ListTile(
                        title: Text(
                          rule.type.label,
                          style: theme.textTheme.titleMedium,
                        ),
                        subtitle: Text(
                          _ruleSummary(rule),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Switch(
                              value: rule.isActive,
                              onChanged: (_) async {
                                await SupabaseService.instance
                                    .setRuleActive(rule.id, !rule.isActive);
                                await _load();
                              },
                            ),
                            IconButton(
                              tooltip: 'Delete rule',
                              icon: Icon(Icons.delete_outline_rounded,
                                  size: 20, color: theme.colorScheme.error),
                              onPressed: () async {
                                await SupabaseService.instance.deleteRule(rule.id);
                                await _load();
                              },
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton.extended(
            heroTag: 'add-rule',
            onPressed: _addRuleSheet,
            icon: const Icon(Icons.add_rounded),
            label: const Text('New rule'),
          ),
        ),
      ],
    );
  }

  String _ruleSummary(ParentalRule rule) {
    final c = rule.config;
    return switch (rule.type) {
      RuleType.screenTimeLimit =>
        'Max ${c['daily_limit_min'] ?? '—'} min/day',
      RuleType.appTimeLimit =>
        '${c['package'] ?? 'app'}: max ${c['limit_min'] ?? '—'} min/day',
      RuleType.appBlock =>
        'Blocking ${c['package'] ?? (c['packages'] as List?)?.join(', ') ?? 'apps'}',
      RuleType.bedtime =>
        '${c['start'] ?? '21:00'} → ${c['end'] ?? '07:00'}',
      RuleType.contentFilter =>
        'Blocked: ${(c['blocked_domains'] as List?)?.join(', ') ?? c['categories'] ?? '—'}',
      RuleType.locationGeofence =>
        'Radius ${c['radius_m'] ?? '—'} m around home',
    };
  }

  Future<void> _addRuleSheet() async {
    RuleType type = RuleType.screenTimeLimit;
    final valueController = TextEditingController();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheet) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 8,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('New rule', style: Theme.of(ctx).textTheme.titleLarge),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: RuleType.values.map((t) {
                      final selected = type == t;
                      return ChoiceChip(
                        label: Text(t.label),
                        selected: selected,
                        onSelected: (_) => setSheet(() => type = t),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  _ruleField(type, valueController),
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Create rule'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (saved != true) return;
    final text = valueController.text.trim();
    try {
      switch (type) {
        case RuleType.screenTimeLimit:
          await SupabaseService.instance.addRule(
            deviceId: widget.device.id,
            type: type,
            config: {'daily_limit_min': int.tryParse(text) ?? 120},
          );
        case RuleType.appTimeLimit:
          await SupabaseService.instance.addRule(
            deviceId: widget.device.id,
            type: type,
            config: {'package': text, 'limit_min': 60},
          );
        case RuleType.appBlock:
          await SupabaseService.instance.addRule(
            deviceId: widget.device.id,
            type: type,
            config: {'package': text},
          );
        case RuleType.contentFilter:
          await SupabaseService.instance.addRule(
            deviceId: widget.device.id,
            type: type,
            config: {'blocked_domains': text.split(',').map((e) => e.trim()).toList()},
          );
        case RuleType.locationGeofence:
          await SupabaseService.instance.addRule(
            deviceId: widget.device.id,
            type: type,
            config: {'radius_m': int.tryParse(text) ?? 200},
          );
        case RuleType.bedtime:
          await SupabaseService.instance.addRule(
            deviceId: widget.device.id,
            type: type,
            config: {'start': '21:30', 'end': '07:00'},
          );
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create rule: $e')),
        );
      }
    }
  }

  Widget _ruleField(RuleType type, TextEditingController controller) {
    final (label, hint) = switch (type) {
      RuleType.screenTimeLimit => ('Minutes per day', '120'),
      RuleType.appTimeLimit => ('Package name', 'com.youtube.app'),
      RuleType.appBlock => ('Package name', 'com.instagram.android'),
      RuleType.contentFilter => ('Domains (comma separated)', 'tiktok.com, reddit.com'),
      RuleType.locationGeofence => ('Radius in meters', '200'),
      RuleType.bedtime => ('Start time (HH:mm)', '21:30'),
    };
    return TextField(
      controller: controller,
      decoration: InputDecoration(labelText: label, hintText: hint),
    );
  }
}
