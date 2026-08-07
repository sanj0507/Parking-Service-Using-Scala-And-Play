# AwaitingPayment Notification — Design

## Problem

`VisitService` already sends customer email/SMS notifications (via Kafka →
`EmailKafkaConsumerService` / `SmsKafkaConsumerService`) at three points in the
visit lifecycle:

- `RequestedCheckIn → CheckedIn` (check-in accepted, slot assigned)
- `→ Ready` (vehicle serviced, includes a checkout link)
- `AwaitingPayment → CheckedOut` (checkout complete, PDF receipt attached)

One transition is silent: `RequestedCheckout → AwaitingPayment`, which happens
in `VisitService.acceptCheckoutRequest` when a valet approves a customer's
checkout request. Since checkout payment is only unlockable after this
approval, the customer currently has no way to know payment is available
unless they happen to be watching the checkout page.

Additionally, `acceptCheckoutRequest` never calls `invalidateCache()`, so
admin dashboard / websocket clients don't get a live update when this
transition happens — every other status-changing method in `VisitService`
does call it.

The notification payload-building code (building the Kafka JSON envelope,
sending email + SMS) is duplicated across four call sites in `VisitService`.

## Scope

1. Send a customer notification when `acceptCheckoutRequest` moves a visit to
   `AwaitingPayment`, including the live bill amount and the payment link.
2. Fix the missing `invalidateCache()` call in `acceptCheckoutRequest`.
3. Extract the duplicated notification-building logic into a shared private
   helper, and migrate the four existing call sites to use it.

Out of scope: notifications for `InProgress` (valet acknowledging a retrieval
request) — evaluated and explicitly decided against, as low-value noise for a
customer who's typically on-site at that point. No new Kafka topics, message
types, or email templates.

## Design

### Shared notification helper

Add a private helper to `VisitService`:

```scala
private def notify(
    visit: Visit,
    message: String,
    emailType: String,
    spot: Option[String] = None,
    price: Option[String] = None
): Unit = {
  val payload = Json.obj(
    "customerName" -> visit.customerName,
    "email" -> visit.email.getOrElse(""),
    "message" -> message,
    "emailType" -> emailType,
    "bookingId" -> visit.id.toString,
    "spot" -> spot.getOrElse(""),
    "price" -> price.getOrElse("")
  ).toString()
  kafkaService.sendEmailNotification(payload)
  visit.phoneNumber.foreach(phone => kafkaService.sendSmsNotification(phone, message))
}
```

This replaces the inline payload-building blocks in:
- `acknowledgeRequest` (the `RequestedCheckIn` branch — `emailType = "CHECKIN"`)
- `markReady` (`emailType = "UPDATE"`)
- `completeAddOn` (`emailType = "UPDATE"`)
- `sendCheckoutNotifications` (`emailType = "CHECKOUT"`)

Behavior for all four is unchanged — this is pure deduplication, not a
behavior change.

### New AwaitingPayment notification

In `acceptCheckoutRequest`, after `repo.updateStatus(id, AwaitingPayment)`
succeeds:

1. Call `calculateBill(id)` to get the current fee.
2. Build the message:
   ```
   your vehicle {vehicleNumber} checkout has been approved. Amount due:
   ₹{totalFee}. Complete your payment here: {frontendUrl}/checkout/{id}
   ```
   using the same `app.frontend.url` config key and `/checkout/{id}` URL
   pattern already used by the `Ready` notification.
3. Call `notify(visit, message, emailType = "UPDATE")`.
4. Call `invalidateCache()`.

### Error handling

If `calculateBill` fails, the `acceptCheckoutRequest` future fails and
`VisitController.acceptCheckout` returns `BadRequest` with the error message —
consistent with existing error handling in this method and elsewhere in
`VisitService`. No new failure modes are introduced; no silent fallback paths.

### Testing

There is no existing unit-test coverage for `VisitService` (the only spec in
`test/` is `SmsPhoneNumberFormatterSpec`, for a pure utility class), so this
change does not introduce a new testing pattern. Verification is manual, via
the existing lifecycle flow: check-in → request → acknowledge → ready →
request-checkout → accept-checkout, confirming the email/SMS payload
(amount + link) lands correctly in Mailpit / console SMS logs.

## Explicitly decided against

- **Notification on `Requested → InProgress`**: considered and rejected —
  the customer is typically on-site when the valet starts retrieval, so this
  would be low-value noise.
- **Link-only message (no bill amount) for AwaitingPayment**: rejected in
  favor of including the live amount due, since it saves the customer a click
  to see what they owe before deciding to pay.
