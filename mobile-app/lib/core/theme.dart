import 'package:flutter/material.dart';

/// Aria Console theme — mirrors the web console exactly.
///
/// Light: white + purple (violet-600 brand)
/// Dark:  black + purple (bright violet-400 brand)
///
/// Every color below is converted 1:1 from the site's `globals.css`
/// oklch tokens so the app and the web console feel identical.
abstract final class AriaColors {
  // ── Light (white + purple) ─────────────────────────────────────────
  static const lightBackground = Color(0xFFFFFFFF);
  static const lightForeground = Color(0xFF100E17);
  static const lightCard = Color(0xFFFFFFFF);
  static const lightPrimary = Color(0xFF753ADD);
  static const lightPrimaryForeground = Color(0xFFFCFBFD);
  static const lightSecondary = Color(0xFFF1EEF9);
  static const lightSecondaryForeground = Color(0xFF302749);
  static const lightMuted = Color(0xFFF3F0F8);
  static const lightMutedForeground = Color(0xFF646170);
  static const lightBorder = Color(0xFFE5E0EF);
  static const lightDestructive = Color(0xFFDF202E);
  static const lightRing = Color(0xFF8359E3);
  static const lightPrimarySoft = Color(0xFFEEE7FD);

  // ── Dark (black + purple) ──────────────────────────────────────────
  static const darkBackground = Color(0xFF060408);
  static const darkForeground = Color(0xFFEFEDF4);
  static const darkCard = Color(0xFF0D0B12);
  static const darkPrimary = Color(0xFFA177FF);
  static const darkPrimaryForeground = Color(0xFF060408);
  static const darkSecondary = Color(0xFF1C1823);
  static const darkSecondaryForeground = Color(0xFFE9E6F1);
  static const darkMuted = Color(0xFF17141D);
  static const darkMutedForeground = Color(0xFF9A95A6);
  static const darkBorder = Color(0xFF26222D);
  static const darkDestructive = Color(0xFFF94144);
  static const darkRing = Color(0xFF9F7CFF);
  static const darkPrimarySoft = Color(0xFF1D1727);

  // Shared semantic colors
  static const success = Color(0xFF22A06B);
  static const warning = Color(0xFFE8A23D);
  static const critical = Color(0xFFF94144);
  static const info = Color(0xFF4BA3F5);

  /// Brand gradient used on the logo mark / hero surfaces.
  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF753ADD), Color(0xFFA177FF)],
  );
}

/// Builds the light ThemeData — clean white surfaces, purple accents.
ThemeData buildLightTheme() {
  const scheme = ColorScheme.light(
    primary: AriaColors.lightPrimary,
    onPrimary: AriaColors.lightPrimaryForeground,
    secondary: AriaColors.lightSecondary,
    onSecondary: AriaColors.lightSecondaryForeground,
    surface: AriaColors.lightCard,
    onSurface: AriaColors.lightForeground,
    error: AriaColors.lightDestructive,
    onError: Colors.white,
    outline: AriaColors.lightBorder,
    outlineVariant: AriaColors.lightBorder,
    surfaceContainerHighest: AriaColors.lightMuted,
    onSurfaceVariant: AriaColors.lightMutedForeground,
  );
  return _baseTheme(scheme, AriaColors.lightBackground, AriaColors.lightCard,
      AriaColors.lightMuted, AriaColors.lightBorder, AriaColors.lightPrimarySoft);
}

/// Builds the dark ThemeData — near-black canvas, bright violet accents.
ThemeData buildDarkTheme() {
  const scheme = ColorScheme.dark(
    primary: AriaColors.darkPrimary,
    onPrimary: AriaColors.darkPrimaryForeground,
    secondary: AriaColors.darkSecondary,
    onSecondary: AriaColors.darkSecondaryForeground,
    surface: AriaColors.darkCard,
    onSurface: AriaColors.darkForeground,
    error: AriaColors.darkDestructive,
    onError: Colors.white,
    outline: AriaColors.darkBorder,
    outlineVariant: AriaColors.darkBorder,
    surfaceContainerHighest: AriaColors.darkMuted,
    onSurfaceVariant: AriaColors.darkMutedForeground,
  );
  return _baseTheme(scheme, AriaColors.darkBackground, AriaColors.darkCard,
      AriaColors.darkMuted, AriaColors.darkBorder, AriaColors.darkPrimarySoft);
}

ThemeData _baseTheme(
  ColorScheme scheme,
  Color scaffold,
  Color card,
  Color muted,
  Color border,
  Color primarySoft,
) {
  final isDark = scheme.brightness == Brightness.dark;
  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: scaffold,
    splashFactory: InkSparkle.splashFactory,
    appBarTheme: AppBarTheme(
      backgroundColor: scaffold,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: scheme.onSurface,
      ),
      iconTheme: IconThemeData(color: scheme.onSurface),
    ),
    cardTheme: CardTheme(
      color: card,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: border),
      ),
    ),
    dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: muted,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.primary, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.error, width: 1.6),
      ),
      labelStyle: TextStyle(color: scheme.onSurfaceVariant),
      hintStyle: TextStyle(color: scheme.onSurfaceVariant.withAlpha(150)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: scheme.primary,
        side: BorderSide(color: isDark ? AriaColors.darkBorder : AriaColors.lightBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        minimumSize: const Size.fromHeight(44),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: scheme.primary),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(foregroundColor: scheme.onSurfaceVariant),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: card,
      indicatorColor: primarySoft,
      surfaceTintColor: Colors.transparent,
      height: 64,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final color = states.contains(WidgetState.selected)
            ? scheme.primary
            : scheme.onSurfaceVariant;
        return IconThemeData(color: color, size: 24);
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final color = states.contains(WidgetState.selected)
            ? scheme.primary
            : scheme.onSurfaceVariant;
        return TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: color);
      }),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: muted,
      selectedColor: primarySoft,
      side: BorderSide(color: border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      labelStyle: TextStyle(fontSize: 12.5, color: scheme.onSurface),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: isDark ? AriaColors.darkSecondary : AriaColors.lightForeground,
      contentTextStyle: TextStyle(color: isDark ? AriaColors.darkForeground : Colors.white),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    dialogTheme: DialogTheme(
      backgroundColor: card,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      titleTextStyle: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: scheme.onSurface,
      ),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: card,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      showDragHandle: true,
    ),
    listTileTheme: ListTileThemeData(
      iconColor: scheme.onSurfaceVariant,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: scheme.primary),
    tabBarTheme: TabBarTheme(
      labelColor: scheme.primary,
      unselectedLabelColor: scheme.onSurfaceVariant,
      indicatorColor: scheme.primary,
      labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
      dividerColor: border,
      indicatorSize: TabBarIndicatorSize.tab,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return scheme.onPrimary;
        return isDark ? AriaColors.darkMutedForeground : Colors.white;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return scheme.primary;
        return isDark ? AriaColors.darkBorder : AriaColors.lightBorder;
      }),
    ),
    radioTheme: RadioThemeData(fillColor: WidgetStateProperty.all(scheme.primary)),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? scheme.primary : Colors.transparent,
      ),
      side: BorderSide(color: border),
    ),
    textTheme: TextTheme(
      headlineMedium: TextStyle(
        fontSize: 26,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.8,
        color: scheme.onSurface,
      ),
      titleLarge: TextStyle(
        fontSize: 19,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.4,
        color: scheme.onSurface,
      ),
      titleMedium: TextStyle(
        fontSize: 15.5,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: scheme.onSurface,
      ),
      bodyMedium: TextStyle(fontSize: 14, height: 1.45, color: scheme.onSurface),
      bodySmall: TextStyle(fontSize: 12.5, height: 1.4, color: scheme.onSurfaceVariant),
      labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: scheme.onSurfaceVariant),
    ),
  );
}
