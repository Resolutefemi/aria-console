import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_shell.dart';
import 'state/app_state.dart';

const _supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://gvcsbkwnpebpflazpucb.supabase.co',
);
const _supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue:
      'sb_publishable_BQx3z_DJ1NWZEPsgrMFT5w_SnfgIw8D',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: _supabaseUrl, publishableKey: _supabaseAnonKey);
  runApp(const AriaConsoleApp());
}

class AriaConsoleApp extends StatelessWidget {
  const AriaConsoleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(),
      child: Consumer<AppState>(
        builder: (context, state, _) {
          return MaterialApp(
            title: 'Aria Console',
            debugShowCheckedModeBanner: false,
            themeMode: state.themeMode,
            theme: buildLightTheme(),
            darkTheme: buildDarkTheme(),
            home: const AuthGate(),
          );
        },
      ),
    );
  }
}

/// Shows Login until a session exists, then the main shell.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    if (!state.authReady && state.authUser == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return state.authUser == null ? const LoginScreen() : const HomeShell();
  }
}
