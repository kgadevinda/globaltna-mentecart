part of 'catalog_bloc.dart';

sealed class CatalogEvent extends Equatable {
  const CatalogEvent();

  @override
  List<Object?> get props => [];
}

final class CatalogRequested extends CatalogEvent {
  const CatalogRequested({
    this.searchQuery,
    this.category,
  });

  final String? searchQuery;
  final String? category;

  @override
  List<Object?> get props => [searchQuery, category];
}

final class CatalogSearchChanged extends CatalogEvent {
  const CatalogSearchChanged(this.searchQuery);

  final String searchQuery;

  @override
  List<Object?> get props => [searchQuery];
}

final class CatalogCategoryChanged extends CatalogEvent {
  const CatalogCategoryChanged(this.category);

  final String category;

  @override
  List<Object?> get props => [category];
}
