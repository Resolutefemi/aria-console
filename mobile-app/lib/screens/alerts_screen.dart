import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../data/models.dart';
import '../data/supabase_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

/// Security alerts with severity filters and acknowledge / resolve.
class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  String _filter = 'OPEN';

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final theme = Theme.of(context);
    final filtered = state.alerts.where((a) {
      return switch (_filter) {
        'OPEN' => a.isOpen,
        'ALL' => true,
        _ => a.severity.name.toUpperCase() == _filter,
      };
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => state.refreshAlerts(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _chip(theme, 'OPEN'),
                const SizedBox(width: 8),
                _chip(theme, 'CRITICAL'),
                const SizedBox(width: 8),
                _chip(theme, 'WARNING'),
                const SizedBox(width: 8),
                _chip(theme, 'ALL'),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: theme.colorScheme.primary,
              onRefresh: () => state.refreshAlerts(),
              child: state.alertsLoading && filtered.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: const [
                            SizedBox(height: 90),
                            EmptyState(
                              icon: Icons.verified_user_outlined,
                              title: 'Nothing here',
                              subtitle:
                                  'No alerts match this filter. The app listens '
                                  'in realtime — new alerts pop up instantly.',
                            ),
                          ],
                        )
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding:
                              const EdgeInsets.fromLTRB(16, 4, 16, 90),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) => _AlertCard(alert: filtered[i]),
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(ThemeData theme, String label) {
    final selected = _filter == label;
    final color = switch (label) {
      'CRITICAL' => AriaColors.critical,
      'WARNING' => AriaColors.warning,
      _ => theme.colorScheme.primary,
    };
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _filter = label),
      selectedColor: color.withAlpha(30),
      checkmarkColor: color,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        color: selected ? color : theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  const _AlertCard({required this.alert});
  final SecurityAlert alert;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = context.read<AppState>();
    final color = severityColor(alert.severity);
    final device = state.deviceById(alert.deviceId);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: color.withAlpha(26),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.warning_amber_rounded, size: 19, color: color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert.title,
                        style: theme.textTheme.titleMedium?.copyWith(fontSize: 14.5),
                      ),
                      Text(
                        timeAgo(alert.triggeredAt) +
                            (device == null ? '' : ' · ${device.name}'),
                        style: theme.textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
                SeverityBadge(severity: alert.severity),
              ],
            ),
            const SizedBox(height: 10),
            Text(alert.description, style: theme.textTheme.bodySmall),
            const SizedBox(height: 12),
            Row(
              children: [
                if (alert.isOpen) ...[
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    onPressed: () async {
                      await SupabaseService.instance
                          .updateAlertStatus(alert.id, 'ACKNOWLEDGED');
                      await state.refreshAlerts();
                    },
                    child: const Text('Acknowledge'),
                  ),
                  const SizedBox(width: 8),
                ],
                if (alert.isOpen || alert.status == AlertStatus.acknowledged)
                  FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    onPressed: () async {
                      await SupabaseService.instance
                          .updateAlertStatus(alert.id, 'RESOLVED');
                      await state.refreshAlerts();
                    },
                    child: const Text('Resolve'),
                  ),
                if (!alert.isOpen && alert.status != AlertStatus.acknowledged)
                  Text(
                    alert.status.name.toUpperCase(),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AriaColors.success,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                const Spacer(),
                if (alert.status == AlertStatus.acknowledged)
                  Text('ACKNOWLEDGED', style: theme.textTheme.labelSmall),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
