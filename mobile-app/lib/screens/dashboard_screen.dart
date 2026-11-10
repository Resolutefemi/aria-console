import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../data/models.dart';
import '../state/app_state.dart';
import 'device_detail_screen.dart';
import '../widgets/common.dart';

/// Overview: greeting, live stats, quick alerts preview and devices.
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final theme = Theme.of(context);
    final profile = state.profile;
    final firstName = (profile?.name ?? 'there').split(' ').first;
    final openAlerts = state.openAlerts;
    final devices = state.devices;
    final online = state.onlineCount();

    return RefreshIndicator(
      onRefresh: () => state.refreshAll(),
      color: theme.colorScheme.primary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            title: Row(
              children: [
                const BrandMark(size: 34, radius: 10),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hi $firstName',
                      style: theme.textTheme.titleMedium,
                    ),
                    Text(
                      'Aria Console',
                      style: theme.textTheme.labelSmall,
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              IconButton(
                tooltip: 'Refresh',
                onPressed: () => state.refreshAll(),
                icon: const Icon(Icons.refresh_rounded),
              ),
              const SizedBox(width: 4),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // ── Stats grid ──
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        icon: Icons.devices_rounded,
                        label: 'Devices online',
                        value: '$online/${devices.length}',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StatCard(
                        icon: Icons.notifications_active_rounded,
                        label: 'Open alerts',
                        value: '${openAlerts.length}',
                        tint: openAlerts.isEmpty
                            ? AriaColors.success
                            : AriaColors.critical,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        icon: Icons.phone_android_rounded,
                        label: 'Phones & tablets',
                        value: '${devices.where((d) => d.type == DeviceType.phone || d.type == DeviceType.tablet).length}',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StatCard(
                        icon: Icons.laptop_mac_rounded,
                        label: 'Computers',
                        value: '${devices.where((d) => d.isComputer).length}',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // ── Latest alerts ──
                SectionHeader(
                  'Security alerts',
                  action: openAlerts.isEmpty
                      ? null
                      : Text(
                          '${openAlerts.length} open',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AriaColors.critical,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
                if (state.alerts.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.verified_user_rounded,
                              color: AriaColors.success, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'All quiet — no alerts recorded.',
                              style: theme.textTheme.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...state.alerts.take(3).map(
                        (a) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _AlertPreview(alert: a),
                        ),
                      ),
                const SizedBox(height: 24),

                // ── Devices preview ──
                const SectionHeader('Linked devices'),
                if (devices.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        'No devices paired yet. Open the Devices tab and tap '
                        '“Pair device” to link a phone, tablet or laptop.',
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  )
                else
                  ...devices.take(4).map(
                        (d) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: DeviceRow(device: d),
                        ),
                      ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertPreview extends StatelessWidget {
  const _AlertPreview({required this.alert});
  final SecurityAlert alert;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = severityColor(alert.severity);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withAlpha(26),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.warning_amber_rounded, color: color, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alert.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(fontSize: 14),
                  ),
                  Text(
                    alert.description,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(timeAgo(alert.triggeredAt), style: theme.textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

/// Reusable device row — also used by the devices screen.
class DeviceRow extends StatelessWidget {
  const DeviceRow({super.key, required this.device, this.onTap});
  final Device device;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: ListTile(
        onTap: onTap ??
            () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => DeviceDetailScreen(deviceId: device.id),
                  ),
                ),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withAlpha(22),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            deviceTypeIcon(device.type),
            color: theme.colorScheme.primary,
            size: 21,
          ),
        ),
        title: Text(
          device.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.titleMedium?.copyWith(fontSize: 14.5),
        ),
        subtitle: Text(
          '${device.room} · ${timeAgo(device.lastSeenAt)}',
          style: theme.textTheme.bodySmall,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            StatusDot(status: device.status),
            const SizedBox(width: 8),
            Icon(
              device.status == DeviceStatus.charging
                  ? Icons.bolt_rounded
                  : Icons.battery_full_rounded,
              size: 17,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            Text('${device.battery}%', style: theme.textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}
