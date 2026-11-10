import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'package:supabase_flutter/supabase_flutter.dart' show RealtimeChannel;
import '../data/models.dart';
import '../data/supabase_service.dart';
import '../state/app_state.dart';

/// Generate a pairing code (like FlashGet Kids): the parent shows the
/// 6-digit code / QR, the companion app on the child device enters it,
/// and the parent app flips to "paired" in realtime.
class PairingScreen extends StatefulWidget {
  const PairingScreen({super.key});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  final _name = TextEditingController();
  String _type = 'PHONE';
  DevicePairing? _pairing;
  RealtimeChannel? _channel;
  bool _creating = false;
  String? _error;
  Timer? _ticker;

  static const _types = [
    ('PHONE', 'Phone', Icons.smartphone_rounded),
    ('TABLET', 'Tablet', Icons.tablet_mac_rounded),
    ('TV', 'TV', Icons.tv_rounded),
    ('DISPLAY', 'Laptop / PC', Icons.laptop_mac_rounded),
    ('WATCH', 'Watch', Icons.watch_rounded),
    ('SPEAKER', 'Speaker', Icons.speaker_rounded),
  ];

  @override
  void dispose() {
    _name.dispose();
    _ticker?.cancel();
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _createPairing() async {
    setState(() {
      _creating = true;
      _error = null;
    });
    try {
      final pairing = await SupabaseService.instance.createPairing(
        deviceName: _name.text.trim().isEmpty ? 'New device' : _name.text.trim(),
        deviceType: _type,
      );
      _channel = SupabaseService.instance.watchPairing(pairing.id, () async {
        _ticker?.cancel();
        if (!mounted) return;
        await context.read<AppState>().refreshDevices();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Device paired successfully!'),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );
        if (mounted) Navigator.of(context).pop();
      });
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
      setState(() => _pairing = pairing);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pairing = _pairing;

    return Scaffold(
      appBar: AppBar(title: const Text('Pair a device')),
      body: pairing == null ? _buildForm(theme) : _buildCode(theme, pairing),
    );
  }

  // ── Step 1: form ─────────────────────────────────────────────────────

  Widget _buildForm(ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withAlpha(22),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.help_outline_rounded,
                      color: theme.colorScheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Generate a pairing code, then open Aria Companion on '
                    'the device you want to link and enter the code there.',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            labelText: 'Device name',
            hintText: 'e.g. Femi’s iPhone',
          ),
        ),
        const SizedBox(height: 14),
        Text('Device type', style: theme.textTheme.titleMedium),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.15,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: _types.map((t) => _typeTile(theme, t)).toList(),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: TextStyle(color: theme.colorScheme.error, fontSize: 12.5),
          ),
        ],
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _creating ? null : _createPairing,
          child: _creating
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Generate pairing code'),
        ),
      ],
    );
  }

  Widget _typeTile(ThemeData theme, (String, String, IconData) t) {
    final selected = _type == t.$1;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => setState(() => _type = t.$1),
      child: Container(
        decoration: BoxDecoration(
          color: selected
              ? theme.colorScheme.primary.withAlpha(30)
              : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? theme.colorScheme.primary : theme.colorScheme.outline,
            width: selected ? 1.6 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              t.$3,
              size: 24,
              color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 6),
            Text(
              t.$2,
              style: TextStyle(
                fontSize: 11,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Step 2: show code + QR ──────────────────────────────────────────

  Widget _buildCode(ThemeData theme, DevicePairing pairing) {
    final expires = pairing.expiresAt?.toLocal();
    final remaining = expires == null
        ? Duration.zero
        : expires.difference(DateTime.now());
    final mins = remaining.inMinutes;
    final secs = remaining.inSeconds % 60;
    final expired = remaining <= Duration.zero;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text('Enter this code in Aria Companion',
                    style: theme.textTheme.titleMedium),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withAlpha(22),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: theme.colorScheme.primary.withAlpha(70)),
                  ),
                  child: Text(
                    pairing.shortCode,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 8,
                      color: theme.colorScheme.primary,
                      height: 1,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  expired
                      ? 'This code has expired — generate a new one.'
                      : 'Expires in $mins:${secs.toString().padLeft(2, '0')}',
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: QrImageView(
                    data: 'aria-pair:${pairing.code}',
                    size: 170,
                    backgroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('How to pair', style: theme.textTheme.titleMedium),
                const SizedBox(height: 10),
                _step(theme, '1', 'Install Aria Companion on the device.'),
                _step(theme, '2', 'Open it and tap “Pair with parent”.'),
                _step(theme, '3', 'Type the 6-digit code shown above.'),
                _step(theme, '4', 'This screen closes automatically once '
                    'the device is linked — keep it open.'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 10),
              Text('Waiting for the device to pair…',
                  style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ],
    );
  }

  Widget _step(ThemeData theme, String n, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withAlpha(28),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              n,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }
}
