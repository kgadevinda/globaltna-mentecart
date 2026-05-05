import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';
import 'service_repository.dart';

part 'service_detail_event.dart';
part 'service_detail_state.dart';

class ServiceDetailBloc extends Bloc<ServiceDetailEvent, ServiceDetailState> {
  ServiceDetailBloc({
    required ServiceRepository serviceRepository,
  })  : _serviceRepository = serviceRepository,
        super(const ServiceDetailState()) {
    on<ServiceDetailRequested>(_onRequested);
  }

  final ServiceRepository _serviceRepository;

  Future<void> _onRequested(
    ServiceDetailRequested event,
    Emitter<ServiceDetailState> emit,
  ) async {
    emit(state.copyWith(status: ServiceDetailStatus.loading, clearError: true));

    try {
      final service = await _serviceRepository.fetchServiceDetail(event.serviceId);
      emit(
        state.copyWith(
          status: ServiceDetailStatus.success,
          service: service,
        ),
      );
    } on ApiFailure catch (failure) {
      emit(
        state.copyWith(
          status: ServiceDetailStatus.failure,
          errorMessage: failure.message,
        ),
      );
    }
  }
}
