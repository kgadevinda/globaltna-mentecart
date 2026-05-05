part of 'service_detail_bloc.dart';

enum ServiceDetailStatus { loading, success, failure }

class ServiceDetailState extends Equatable {
  const ServiceDetailState({
    this.status = ServiceDetailStatus.loading,
    this.service,
    this.errorMessage,
  });

  final ServiceDetailStatus status;
  final ServiceDetail? service;
  final String? errorMessage;

  ServiceDetailState copyWith({
    ServiceDetailStatus? status,
    ServiceDetail? service,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ServiceDetailState(
      status: status ?? this.status,
      service: service ?? this.service,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, service, errorMessage];
}
