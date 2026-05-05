import 'package:equatable/equatable.dart';

class UserProfile extends Equatable {
  const UserProfile({
    required this.id,
    required this.email,
    required this.bookingCapPerDay,
    this.role = 'customer',
    this.name,
  });

  final String id;
  final String? name;
  final String email;
  final int bookingCapPerDay;
  final String role;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      name: json['name'] as String?,
      email: json['email'] as String,
      bookingCapPerDay: (json['bookingCapPerDay'] as num).toInt(),
      role: json['role'] as String? ?? 'customer',
    );
  }

  @override
  List<Object?> get props => [id, name, email, bookingCapPerDay, role];
}

class AuthSession extends Equatable {
  const AuthSession({
    required this.token,
    required this.user,
  });

  final String token;
  final UserProfile user;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      token: json['token'] as String,
      user: UserProfile.fromJson(json['user'] as Map<String, dynamic>),
    );
  }

  @override
  List<Object?> get props => [token, user];
}

class ServiceSummary extends Equatable {
  const ServiceSummary({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.durationMinutes,
    required this.category,
    required this.imageUrl,
    required this.slotCapacity,
  });

  final String id;
  final String title;
  final String description;
  final double price;
  final int durationMinutes;
  final String category;
  final String imageUrl;
  final int slotCapacity;

  factory ServiceSummary.fromJson(Map<String, dynamic> json) {
    return ServiceSummary(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      price: (json['price'] as num).toDouble(),
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      category: json['category'] as String,
      imageUrl: json['imageUrl'] as String,
      slotCapacity: (json['slotCapacity'] as num).toInt(),
    );
  }

  @override
  List<Object?> get props => [id, title, description, price, durationMinutes, category, imageUrl, slotCapacity];
}

class ServiceSlot extends Equatable {
  const ServiceSlot({
    required this.startsAt,
    required this.capacity,
    required this.reservedCount,
    required this.bookedCount,
    required this.remainingCapacity,
  });

  final DateTime startsAt;
  final int capacity;
  final int reservedCount;
  final int bookedCount;
  final int remainingCapacity;

  factory ServiceSlot.fromJson(Map<String, dynamic> json) {
    return ServiceSlot(
      startsAt: DateTime.parse(json['startsAt'] as String),
      capacity: (json['capacity'] as num).toInt(),
      reservedCount: (json['reservedCount'] as num).toInt(),
      bookedCount: (json['bookedCount'] as num).toInt(),
      remainingCapacity: (json['remainingCapacity'] as num).toInt(),
    );
  }

  @override
  List<Object?> get props => [startsAt, capacity, reservedCount, bookedCount, remainingCapacity];
}

class ServiceDetail extends Equatable {
  const ServiceDetail({
    required this.summary,
    required this.slots,
  });

  final ServiceSummary summary;
  final List<ServiceSlot> slots;

  factory ServiceDetail.fromJson(Map<String, dynamic> json) {
    return ServiceDetail(
      summary: ServiceSummary.fromJson(json),
      slots: (json['slots'] as List<dynamic>)
          .map((slot) => ServiceSlot.fromJson(slot as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [summary, slots];
}

class ServiceCatalog extends Equatable {
  const ServiceCatalog({
    required this.items,
    required this.total,
    required this.hasMore,
  });

  final List<ServiceSummary> items;
  final int total;
  final bool hasMore;

  factory ServiceCatalog.fromJson(Map<String, dynamic> json) {
    return ServiceCatalog(
      items: (json['items'] as List<dynamic>)
          .map((item) => ServiceSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num).toInt(),
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }

  @override
  List<Object?> get props => [items, total, hasMore];
}

class CartItem extends Equatable {
  const CartItem({
    required this.id,
    required this.serviceId,
    required this.title,
    required this.category,
    required this.imageUrl,
    required this.price,
    required this.durationMinutes,
    required this.scheduledAt,
    required this.quantity,
    required this.lineTotal,
    required this.holdExpiresAt,
  });

  final String id;
  final String serviceId;
  final String title;
  final String category;
  final String imageUrl;
  final double price;
  final int durationMinutes;
  final DateTime scheduledAt;
  final int quantity;
  final double lineTotal;
  final DateTime holdExpiresAt;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id'] as String,
      serviceId: json['serviceId'] as String,
      title: json['title'] as String,
      category: json['category'] as String,
      imageUrl: json['imageUrl'] as String,
      price: (json['price'] as num).toDouble(),
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      quantity: (json['quantity'] as num).toInt(),
      lineTotal: (json['lineTotal'] as num).toDouble(),
      holdExpiresAt: DateTime.parse(json['holdExpiresAt'] as String),
    );
  }

  @override
  List<Object?> get props => [
        id,
        serviceId,
        title,
        category,
        imageUrl,
        price,
        durationMinutes,
        scheduledAt,
        quantity,
        lineTotal,
        holdExpiresAt,
      ];
}

class CartSnapshot extends Equatable {
  const CartSnapshot({
    required this.items,
    required this.itemCount,
    required this.subtotal,
  });

  final List<CartItem> items;
  final int itemCount;
  final double subtotal;

  const CartSnapshot.empty()
      : items = const [],
        itemCount = 0,
        subtotal = 0;

  factory CartSnapshot.fromJson(Map<String, dynamic> json) {
    return CartSnapshot(
      items: (json['items'] as List<dynamic>)
          .map((item) => CartItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      itemCount: (json['itemCount'] as num).toInt(),
      subtotal: (json['subtotal'] as num).toDouble(),
    );
  }

  @override
  List<Object?> get props => [items, itemCount, subtotal];
}

class BookingAuditEntry extends Equatable {
  const BookingAuditEntry({
    required this.status,
    required this.changedAt,
    this.note,
  });

  final String status;
  final DateTime changedAt;
  final String? note;

  factory BookingAuditEntry.fromJson(Map<String, dynamic> json) {
    return BookingAuditEntry(
      status: json['status'] as String,
      changedAt: DateTime.parse(json['changedAt'] as String),
      note: json['note'] as String?,
    );
  }

  @override
  List<Object?> get props => [status, changedAt, note];
}

class BookingItem extends Equatable {
  const BookingItem({
    required this.serviceId,
    required this.title,
    required this.category,
    required this.imageUrl,
    required this.price,
    required this.durationMinutes,
    required this.scheduledAt,
    required this.quantity,
    required this.lineTotal,
  });

  final String serviceId;
  final String title;
  final String category;
  final String imageUrl;
  final double price;
  final int durationMinutes;
  final DateTime scheduledAt;
  final int quantity;
  final double lineTotal;

  factory BookingItem.fromJson(Map<String, dynamic> json) {
    return BookingItem(
      serviceId: json['serviceId'] as String,
      title: json['title'] as String,
      category: json['category'] as String,
      imageUrl: json['imageUrl'] as String,
      price: (json['price'] as num).toDouble(),
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      quantity: (json['quantity'] as num).toInt(),
      lineTotal: (json['lineTotal'] as num).toDouble(),
    );
  }

  @override
  List<Object?> get props => [
        serviceId,
        title,
        category,
        imageUrl,
        price,
        durationMinutes,
        scheduledAt,
        quantity,
        lineTotal,
      ];
}

class BookingRecord extends Equatable {
  const BookingRecord({
    required this.id,
    required this.bookingNumber,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.subtotal,
    required this.itemCount,
    required this.cancelBy,
    required this.createdAt,
    required this.updatedAt,
    required this.items,
    required this.auditLog,
    this.confirmedAt,
    this.completedAt,
    this.cancelledAt,
    this.failedAt,
  });

  final String id;
  final String bookingNumber;
  final String status;
  final String paymentMethod;
  final String paymentStatus;
  final double subtotal;
  final int itemCount;
  final DateTime cancelBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? confirmedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final DateTime? failedAt;
  final List<BookingItem> items;
  final List<BookingAuditEntry> auditLog;

  bool get canCancel {
    final awaitingPayHere = paymentMethod == 'payhere' && paymentStatus == 'pending';
    return !awaitingPayHere &&
        (status == 'pending' || status == 'confirmed') &&
        cancelBy.isAfter(DateTime.now());
  }

  factory BookingRecord.fromJson(Map<String, dynamic> json) {
    return BookingRecord(
      id: json['id'] as String,
      bookingNumber: json['bookingNumber'] as String,
      status: json['status'] as String,
      paymentMethod: json['paymentMethod'] as String,
      paymentStatus: json['paymentStatus'] as String,
      subtotal: (json['subtotal'] as num).toDouble(),
      itemCount: (json['itemCount'] as num).toInt(),
      cancelBy: DateTime.parse(json['cancelBy'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      confirmedAt: json['confirmedAt'] == null ? null : DateTime.parse(json['confirmedAt'] as String),
      completedAt: json['completedAt'] == null ? null : DateTime.parse(json['completedAt'] as String),
      cancelledAt: json['cancelledAt'] == null ? null : DateTime.parse(json['cancelledAt'] as String),
      failedAt: json['failedAt'] == null ? null : DateTime.parse(json['failedAt'] as String),
      items: (json['items'] as List<dynamic>)
          .map((item) => BookingItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      auditLog: (json['auditLog'] as List<dynamic>)
          .map((entry) => BookingAuditEntry.fromJson(entry as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [
        id,
        bookingNumber,
        status,
        paymentMethod,
        paymentStatus,
        subtotal,
        itemCount,
        cancelBy,
        createdAt,
        updatedAt,
        confirmedAt,
        completedAt,
        cancelledAt,
        failedAt,
        items,
        auditLog,
      ];
}

class PaymentLaunchSession extends Equatable {
  const PaymentLaunchSession({
    required this.provider,
    required this.checkoutUrl,
    required this.expiresAt,
    required this.itemTitle,
  });

  final String provider;
  final String checkoutUrl;
  final DateTime expiresAt;
  final String itemTitle;

  factory PaymentLaunchSession.fromJson(Map<String, dynamic> json) {
    return PaymentLaunchSession(
      provider: json['provider'] as String,
      checkoutUrl: json['checkoutUrl'] as String,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      itemTitle: json['itemTitle'] as String,
    );
  }

  @override
  List<Object?> get props => [provider, checkoutUrl, expiresAt, itemTitle];
}

class CheckoutResult extends Equatable {
  const CheckoutResult({
    required this.booking,
    this.payment,
  });

  final BookingRecord booking;
  final PaymentLaunchSession? payment;

  factory CheckoutResult.fromJson(Map<String, dynamic> json) {
    return CheckoutResult(
      booking: BookingRecord.fromJson(json['booking'] as Map<String, dynamic>),
      payment: json['payment'] == null
          ? null
          : PaymentLaunchSession.fromJson(json['payment'] as Map<String, dynamic>),
    );
  }

  @override
  List<Object?> get props => [booking, payment];
}
