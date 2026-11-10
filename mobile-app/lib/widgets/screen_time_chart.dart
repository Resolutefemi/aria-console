import 'package:flutter/material.dart';

import '../../core/theme.dart';

/// A compact bar chart for daily screen time (last N days).
/// Pure CustomPainter — no chart dependency.
class ScreenTimeBarChart extends StatelessWidget {
  const ScreenTimeBarChart({
    super.key,
    required this.values,
    required this.labels,
  });

  /// Seconds per bar (index 0 = oldest).
  final List<double> values;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxV = values.isEmpty
        ? 0.0
        : values.reduce((a, b) => a > b ? a : b);
    return SizedBox(
      height: 150,
      child: values.isEmpty
          ? Center(
              child: Text(
                'No screen time recorded yet',
                style: theme.textTheme.bodySmall,
              ),
            )
          : CustomPaint(
              painter: _BarsPainter(
                values: values,
                labels: labels,
                max: maxV <= 0 ? 1 : maxV,
                barColor: theme.colorScheme.primary,
                trackColor: theme.colorScheme.outline.withAlpha(60),
                labelColor: theme.colorScheme.onSurfaceVariant,
                softBar: theme.brightness == Brightness.dark
                    ? AriaColors.darkPrimarySoft
                    : AriaColors.lightPrimarySoft,
              ),
              size: Size.infinite,
            ),
    );
  }
}

class _BarsPainter extends CustomPainter {
  _BarsPainter({
    required this.values,
    required this.labels,
    required this.max,
    required this.barColor,
    required this.trackColor,
    required this.labelColor,
    required this.softBar,
  });

  final List<double> values;
  final List<String> labels;
  final double max;
  final Color barColor;
  final Color trackColor;
  final Color labelColor;
  final Color softBar;

  @override
  void paint(Canvas canvas, Size size) {
    const gap = 8.0;
    const labelHeight = 16.0;
    final chartHeight = size.height - labelHeight;
    final barWidth = (size.width - gap * (values.length - 1)) / values.length;

    final trackPaint = Paint()..color = trackColor;
    final barPaint = Paint()
      ..color = barColor
      ..style = PaintingStyle.fill;
    final softPaint = Paint()..color = softBar;

    final labelStyle = TextStyle(fontSize: 10, color: labelColor);

    for (var i = 0; i < values.length; i++) {
      final x = i * (barWidth + gap);
      final full = Rect.fromLTWH(x, 0, barWidth, chartHeight);
      canvas.drawRRect(
        RRect.fromRectAndRadius(full, const Radius.circular(6)),
        trackPaint,
      );

      final v = values[i].clamp(0.0, max);
      final frac = v / max;
      if (frac > 0) {
        final h = chartHeight * frac;
        final bar = Rect.fromLTWH(x, chartHeight - h, barWidth, h);
        canvas.drawRRect(
          RRect.fromRectAndRadius(bar, const Radius.circular(6)),
          frac > 0.35 ? barPaint : softPaint,
        );
      }

      final tp = TextPainter(
        text: TextSpan(text: labels[i], style: labelStyle),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(
        canvas,
        Offset(x + (barWidth - tp.width) / 2, chartHeight + 3),
      );
    }
  }

  @override
  bool shouldRepaint(_BarsPainter old) =>
      old.values != values || old.barColor != barColor;
}
