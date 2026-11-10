// Smoke test — validates the brand widget renders without any
// Supabase/network initialization.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aria_console_mobile/widgets/common.dart';

void main() {
  testWidgets('BrandMark renders the A monogram', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: BrandMark()));
    expect(find.text('A'), findsOneWidget);
  });
}
