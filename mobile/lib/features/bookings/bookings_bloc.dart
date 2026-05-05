import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';
import 'bookings_repository.dart';

part 'bookings_event.dart';
part 'bookings_state.dart';

class BookingsBloc extends Bloc<BookingsEvent, BookingsState> {
  BookingsBloc({
    required BookingsRepository bookingsRepository,
  })  : _bookingsRepository = bookingsRepository,
        super(const BookingsState()) {
    on<BookingsRequested>(_onRequested);
    on<BookingCancellationRequested>(_onCancellationRequested);
  }

  final BookingsRepository _bookingsRepository;

  Future<void> _onRequested(BookingsRequested event, Emitter<BookingsState> emit) async {
    emit(state.copyWith(status: BookingsStatus.loading, clearFeedback: true));

    try {
      final bookings = await _bookingsRepository.fetchBookings();
      emit(state.copyWith(status: BookingsStatus.ready, bookings: bookings));
    } on ApiFailure catch (failure) {
      emit(state.copyWith(status: BookingsStatus.failure, errorMessage: failure.message));
    }
  }

  Future<void> _onCancellationRequested(
    BookingCancellationRequested event,
    Emitter<BookingsState> emit,
  ) async {
    emit(state.copyWith(status: BookingsStatus.submitting, clearFeedback: true));

    try {
      final updatedBooking = await _bookingsRepository.cancelBooking(event.bookingId);
      final updatedList = state.bookings
          .map((booking) => booking.id == updatedBooking.id ? updatedBooking : booking)
          .toList();
      emit(
        state.copyWith(
          status: BookingsStatus.ready,
          bookings: updatedList,
          successMessage: 'Booking cancelled and capacity released.',
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    } on ApiFailure catch (failure) {
      emit(
        state.copyWith(
          status: BookingsStatus.ready,
          errorMessage: failure.message,
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    }
  }
}
