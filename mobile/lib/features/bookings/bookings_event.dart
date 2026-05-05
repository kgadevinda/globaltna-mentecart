part of 'bookings_bloc.dart';

sealed class BookingsEvent extends Equatable {
  const BookingsEvent();

  @override
  List<Object?> get props => [];
}

final class BookingsRequested extends BookingsEvent {
  const BookingsRequested();
}

final class BookingCancellationRequested extends BookingsEvent {
  const BookingCancellationRequested(this.bookingId);

  final String bookingId;

  @override
  List<Object?> get props => [bookingId];
}
