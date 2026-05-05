import 'package:intl/intl.dart';

class AppFormatters {
  static final NumberFormat _currency = NumberFormat.currency(symbol: '\$');
  static final DateFormat _slotDate = DateFormat('EEE, MMM d • h:mm a');
  static final DateFormat _compactDate = DateFormat('MMM d, h:mm a');

  static String currency(num value) => _currency.format(value);

  static String slot(DateTime value) => _slotDate.format(value.toLocal());

  static String compact(DateTime value) => _compactDate.format(value.toLocal());

  static String titleize(String value) {
    return value
        .split('_')
        .where((segment) => segment.isNotEmpty)
        .map((segment) => '${segment[0].toUpperCase()}${segment.substring(1)}')
        .join(' ');
  }
}
