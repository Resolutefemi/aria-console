import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/app_state.dart';
import 'dashboard_screen.dart';
import 'pairing_screen.dart';
import '../widgets/common.dart';

/// All linked devices — phones, tablets, TVs, computers, smart home.
class DevicesScreen extends StatelessWidget {
  const DevicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final theme = Theme.of(context);
    final devices = state.devices;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Devices'),
        actions: [
          IconButton(
            tooltip: 'Pair a device',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const PairingScreen()),
            ),
            icon: const Icon(Icons.add_link_rounded),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => state.refreshDevices(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'pair-fab',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const PairingScreen()),
        ),
        icon: const Icon(Icons.qr_code_2_rounded),
        label: const Text('Pair device'),
      ),
      body: RefreshIndicator(
        color: theme.colorScheme.primary,
        onRefresh: () => state.refreshDevices(),
        child: state.devicesLoading && devices.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : devices.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      const SizedBox(height: 80),
                      EmptyState(
                        icon: Icons.device_hub_rounded,
                        title: 'No devices paired yet',
                        subtitle:
                            'Generate a pairing code and enter it in the '
                            'Aria Companion app on the device you want to link.',
                        action: FilledButton.icon(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(
                                builder: (_) => const PairingScreen()),
                          ),
                          icon: const Icon(Icons.add_link_rounded),
                          label: const Text('Pair a device'),
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                    itemCount: devices.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => DeviceRow(device: devices[i]),
                  ),
      ),
    );
  }
}
