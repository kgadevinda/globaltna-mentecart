# MenteCart

MenteCart is a full-stack service-booking application built for the GlobalTNA technical assessment. It includes a TypeScript `Express + MongoDB (Mongoose)` backend and a Flutter client using `BLoC`, `Dio`, and JWT auth.

## Delivered scope

- Email/password signup, login, and `GET /auth/me`
- Paginated service catalogue with category filter and title search
- Service detail screen with live slot availability
- Server-side cart with slot holds, expiry cleanup, quantity updates, and item removal
- Atomic MongoDB capacity protection using conditional updates
- Checkout flows for `cash`, `pay_on_arrival`, `mock_card`, and `payhere`
- Booking history with guarded cancellation rules and audit log timestamps
- Admin-only booking completion once the scheduled service window has ended
- Structured request logging with `pino` and request ids
- Docker Compose setup for backend + MongoDB + Redis
- Backend integration tests covering booking, cancellation, admin completion, and PayHere webhook flows

## Project structure

- `backend/` Node.js + Express + TypeScript + MongoDB
- `mobile/` Flutter app with feature BLoCs and repository/data layers

## Prerequisites

- Node.js 20+ (tested here with Node 24)
- Flutter stable
- MongoDB local server or MongoDB Atlas
- Docker Desktop if you want the containerized stack
- PayHere sandbox merchant credentials if you want to test the real PayHere gateway end to end

## Backend environment

Copy `backend/.env.example` to `backend/.env` and set the values you need.

Important variables:

- `MONGODB_URI`: local MongoDB or Atlas connection string
- `JWT_SECRET`: at least 16 characters
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: optional bootstrap admin account
- `REDIS_URL`: optional; if omitted or unavailable, the backend falls back to in-process webhook locking
- `PUBLIC_SERVER_URL`: public base URL used for generated PayHere checkout, return, and cancel links
- `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_NOTIFY_URL`: required together only when enabling PayHere

Sample local setup:

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/mentecart
REDIS_URL=
PUBLIC_SERVER_URL=http://localhost:4000
JWT_SECRET=replace-with-a-secure-random-string
JWT_EXPIRES_IN=12h
CLIENT_ORIGIN=*
SLOT_HOLD_MINUTES=15
MAX_BOOKINGS_PER_DAY=3
CANCELLATION_CUTOFF_HOURS=6
HOLD_CLEANUP_INTERVAL_MS=60000
PAYHERE_SANDBOX=true
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_NOTIFY_URL=
PAYHERE_RETURN_URL=
PAYHERE_CANCEL_URL=
PAYHERE_CURRENCY=LKR
SEED_ON_STARTUP=true
USE_IN_MEMORY_DB=false
ADMIN_EMAIL=admin@mentecart.local
ADMIN_PASSWORD=AdminPass123!
ADMIN_NAME=Operations Admin
```

## Run locally

Backend:

```bash
cd backend
npm install
npm run dev
```

The backend serves JSON on `http://localhost:4000`.

- API root: `http://localhost:4000/`
- Health check: `http://localhost:4000/health`
- API base: `http://localhost:4000/api`

If you open `http://localhost:4000/` in a browser, you will see an API status document, not the Flutter UI.

Mobile:

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

Useful API base URLs:

- Android emulator: `http://10.0.2.2:4000/api`
- Flutter web or desktop: `http://localhost:4000/api`
- Physical phone: use your machine's LAN IP

For a simple local web preview:

```bash
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 8080 --dart-define=API_BASE_URL=http://localhost:4000/api
```

Then open `http://127.0.0.1:8080`.

## Docker stack

Run the full containerized backend stack with:

```bash
docker compose up --build
```

That starts:

- `backend` on `http://localhost:4000`
- `mongo` on `mongodb://localhost:27017`
- `redis` on `redis://localhost:6379`

MongoDB and Redis include healthchecks, and the backend waits for both services before starting.

## Demo flow

Customer flow:

1. Sign up from the Flutter app.
2. Browse the seeded services and open a detail page.
3. Pick a future slot and add it to the cart.
4. Check out with `cash`, `pay_on_arrival`, `mock_card`, or `payhere`.
5. Open the bookings tab and cancel an eligible booking before the cutoff.

Admin completion flow:

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured, the backend bootstraps an admin account on startup.

```bash
curl -X POST http://localhost:4000/api/bookings/<bookingId>/complete \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d "{\"note\":\"Service delivered and verified.\"}"
```

The completion endpoint only allows admins to complete `confirmed` bookings after the scheduled service window has ended.

## Payment modes

- `cash`: booking confirms immediately with `paymentStatus: unpaid`
- `pay_on_arrival`: booking confirms immediately with `paymentStatus: unpaid`
- `mock_card`: booking starts pending, then deterministically becomes confirmed or failed based on `simulatePaymentSuccess`
- `payhere`: booking stays pending until the signed PayHere webhook confirms or fails the payment

## PayHere sandbox setup

To test the real PayHere gateway:

1. Create a PayHere sandbox merchant account.
2. Set `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, and a public `PAYHERE_NOTIFY_URL`.
3. Set `PUBLIC_SERVER_URL` to the same public backend base URL.
4. Start the backend and complete checkout with the `payhere` method from the Flutter app.

Important notes:

- PayHere sends payment confirmation to `notify_url` as `application/x-www-form-urlencoded`, not JSON.
- PayHere does not call `notify_url` on `localhost`; use a public domain or tunnel for real sandbox callbacks.
- This project verifies the raw-body signature, processes duplicate callbacks idempotently, and releases reserved capacity on failed or expired payments.

## PayHere sandbox test cards

These cards come from the official PayHere sandbox documentation.

Successful cards:

- Visa: `4916217501611292`
- MasterCard: `5307732125531191`
- AMEX: `346781005510225`

Decline scenarios:

- Insufficient funds (Visa): `4024007194349121`
- Limit exceeded (Visa): `4929119799365646`
- Do not honor (Visa): `4929768900837248`
- Network error (Visa): `4024007120869333`

For cardholder name, CVV, and expiry date, use any valid values accepted by the PayHere sandbox.

## Verification

Backend:

```bash
cd backend
npm run verify
```

Mobile:

```bash
cd mobile
flutter analyze
flutter test
```

## Known limitations

- Real PayHere end-to-end verification still requires your own sandbox merchant credentials and a publicly reachable callback URL.
- The admin completion workflow is API-first; the Flutter app remains customer-facing.
