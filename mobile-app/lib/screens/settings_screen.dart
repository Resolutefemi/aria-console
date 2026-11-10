import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../data/supabase_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

/// Settings: appearance, account, session.
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final theme = Theme.of(context);
    final profile = state.profile;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Account ──
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      gradient: AriaColors.brandGradient,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      (profile?.name ?? 'A').split(' ').map((p) => p.isEmpty ? '' : p[0]).take(2).join().toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(profile?.name ?? 'Parent', style: theme.textTheme.titleMedium),
                        Text(
                          profile?.email ?? '',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withAlpha(24),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      profile?.role ?? '—',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── Appearance ──
          const SectionHeader('Appearance'),
          Card(
            child: Column(
              children: [
                _themeTile(context, 'System default', ThemeMode.system, Icons.brightness_auto_rounded),
                Divider(height: 1, indent: 56, color: theme.colorScheme.outline),
                _themeTile(context, 'Light — white + purple', ThemeMode.light, Icons.light_mode_rounded),
                Divider(height: 1, indent: 56, color: theme.colorScheme.outline),
                _themeTile(context, 'Dark — black + purple', ThemeMode.dark, Icons.dark_mode_rounded),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── About ──
          const SectionHeader('About'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const BrandMark(size: 38, radius: 11),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Aria Console', style: theme.textTheme.titleMedium),
                          Text('v1.0.0 · Parent app', style: theme.textTheme.labelSmall),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Parental controls for voice-driven devices — screen time, '
                    'app blocks, live location, remote commands, web filtering '
                    'and realtime alerts. Synced with the web console.',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Built by Resolute Femi (Ariyo Oluwafemi Stephen)',
                    style: theme.textTheme.labelSmall,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: theme.colorScheme.error,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out'),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Sign out?'),
                  content: const Text('You will need to sign in again.'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Sign out'),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                await SupabaseService.instance.signOut();
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _themeTile(BuildContext context, String label, ThemeMode mode, IconData icon) {
    final state = context.watch<AppState>();
    final theme = Theme.of(context);
    final selected = state.themeMode == mode;
    return ListTile(
      onTap: () => state.setThemeMode(mode),
      leading: Icon(
        icon,
        color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
      ),
      title: Text(
        label,
        style: TextStyle(
          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
        ),
      ),
      trailing: selected
          ? Icon(Icons.check_circle_rounded, color: theme.colorScheme.primary, size: 20)
          : null,
    );
  }
}
