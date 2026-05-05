part of 'service_detail_bloc.dart';

sealed class ServiceDetailEvent extends Equatable {
  const ServiceDetailEvent();

  @override
  List<Object?> get props => [];
}

final class ServiceDetailRequested extends ServiceDetailEvent {
  const ServiceDetailRequested(this.serviceId);

  final String serviceId;

  @override
  List<Object?> get props => [serviceId];
}
