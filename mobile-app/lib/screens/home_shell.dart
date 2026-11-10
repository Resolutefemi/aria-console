import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/app_state.dart';
import 'alerts_screen.dart';
import 'dashboard_screen.dart';
import 'devices_screen.dart';
import 'settings_screen.dart';

/// Bottom-nav shell: Dashboard · Devices · Alerts · Settings.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final openCount = state.openAlerts.length;

    final screens = [
      const DashboardScreen(),
      const DevicesScreen(),
      const AlertsScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) {
          setState(() => _index = i);
          if (i == 0) context.read<AppState>().refreshAll();
          if (i == 1) context.read<AppState>().refreshDevices();
          if (i == 2) context.read<AppState>().refreshAlerts();
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: 'Dashboard',
          ),
          const NavigationDestination(
            icon: Icon(Icons.devices_outlined),
            selectedIcon: Icon(Icons.devices_rounded),
            label: 'Devices',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: openCount > 0,
              label: Text('$openCount'),
              backgroundColor: AriaColors.critical,
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: openCount > 0,
              label: Text('$openCount'),
              backgroundColor: AriaColors.critical,
              child: const Icon(Icons.notifications_rounded),
            ),
            label: 'Alerts',
          ),
          const NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings_rounded),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
