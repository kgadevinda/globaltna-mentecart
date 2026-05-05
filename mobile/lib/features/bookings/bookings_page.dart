import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/models/app_models.dart';
import '../../core/utils/formatters.dart';
import 'bookings_bloc.dart';

class BookingsPage extends StatelessWidget {
  const BookingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BookingsBloc, BookingsState>(
      listenWhen: (previous, current) => previous.feedbackTick != current.feedbackTick,
      listener: (context, state) {
        final message = state.errorMessage ?? state.successMessage;
        if (message != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
        }
      },
      builder: (context, state) {
        if (state.status == BookingsStatus.loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state.bookings.isEmpty) {
          return const Center(
            child: _BookingsMessageCard(
              title: 'No bookings yet',
              message: 'Once you check out from the cart, your booking history will appear here.',
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            context.read<BookingsBloc>().add(const BookingsRequested());
          },
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            itemBuilder: (context, index) {
              final booking = state.bookings[index];
              return _BookingCard(booking: booking);
            },
            separatorBuilder: (_, index) => const SizedBox(height: 16),
            itemCount: state.bookings.length,
          ),
        );
      },
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking});

  final BookingRecord booking;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.bookingNumber,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 4),
                      Text('Created ${AppFormatters.compact(booking.createdAt)}'),
                    ],
                  ),
                ),
                _StatusBadge(status: booking.status),
              ],
            ),
            const SizedBox(height: 16),
            ...booking.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(AppFormatters.slot(item.scheduledAt)),
                          Text('${item.quantity} x ${AppFormatters.currency(item.price)}'),
                        ],
                      ),
                    ),
                    Text(AppFormatters.currency(item.lineTotal)),
                  ],
                ),
              ),
            ),
            const Divider(height: 24),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _InlinePill(label: 'Payment ${AppFormatters.titleize(booking.paymentMethod)}'),
                _InlinePill(label: 'Status ${AppFormatters.titleize(booking.paymentStatus)}'),
                _InlinePill(label: 'Cancel by ${AppFormatters.compact(booking.cancelBy)}'),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'Latest update: ${booking.auditLog.last.status} at ${AppFormatters.compact(booking.auditLog.last.changedAt)}',
            ),
            if (booking.auditLog.last.note != null) ...[
              const SizedBox(height: 4),
              Text(booking.auditLog.last.note!),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  AppFormatters.currency(booking.subtotal),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                    color: Color(0xFF0F5F66),
                  ),
                ),
                const Spacer(),
                if (booking.canCancel)
                  OutlinedButton(
                    onPressed: () {
                      context.read<BookingsBloc>().add(
                            BookingCancellationRequested(booking.id),
                          );
                    },
                    child: const Text('Cancel Booking'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'confirmed' => const Color(0xFF0F7D57),
      'pending' => const Color(0xFFB26A00),
      'failed' => const Color(0xFFC0392B),
      'cancelled' => const Color(0xFF7F8C8D),
      'completed' => const Color(0xFF3B82F6),
      _ => const Color(0xFF17323A),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        AppFormatters.titleize(status),
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _InlinePill extends StatelessWidget {
  const _InlinePill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F3EC),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(label),
    );
  }
}

class _BookingsMessageCard extends StatelessWidget {
  const _BookingsMessageCard({
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
