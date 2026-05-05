part of 'bookings_bloc.dart';

enum BookingsStatus { loading, ready, failure, submitting }

class BookingsState extends Equatable {
  const BookingsState({
    this.status = BookingsStatus.loading,
    this.bookings = const [],
    this.errorMessage,
    this.successMessage,
    this.feedbackTick = 0,
  });

  final BookingsStatus status;
  final List<BookingRecord> bookings;
  final String? errorMessage;
  final String? successMessage;
  final int feedbackTick;

  BookingsState copyWith({
    BookingsStatus? status,
    List<BookingRecord>? bookings,
    String? errorMessage,
    String? successMessage,
    int? feedbackTick,
    bool clearFeedback = false,
  }) {
    return BookingsState(
      status: status ?? this.status,
      bookings: bookings ?? this.bookings,
      errorMessage: clearFeedback ? null : errorMessage ?? this.errorMessage,
      successMessage: clearFeedback ? null : successMessage ?? this.successMessage,
      feedbackTick: feedbackTick ?? this.feedbackTick,
    );
  }

  @override
  List<Object?> get props => [status, bookings, errorMessage, successMessage, feedbackTick];
}
