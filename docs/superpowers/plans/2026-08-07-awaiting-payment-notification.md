# AwaitingPayment Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify customers by email/SMS when a valet approves their checkout request (visit status `RequestedCheckout → AwaitingPayment`), and fix a related missing cache-invalidation call — reusing the existing Kafka notification pipeline.

**Architecture:** All changes are contained to `app/service/VisitService.scala`. Task 1 extracts a private `notify` helper and migrates the four existing inline notification call sites to use it (pure refactor, no behavior change). Task 2 adds the new notification + cache invalidation to `acceptCheckoutRequest`.

**Tech Stack:** Scala, Play Framework, Slick, Kafka (`KafkaProducerService`), existing `Visit` model. No new dependencies.

## Global Constraints

- Reuse the existing Kafka → `EmailKafkaConsumerService` / `SmsKafkaConsumerService` pipeline. No new Kafka topics, message types, or email templates.
- No new automated tests — `VisitService` has no existing unit-test coverage (only `SmsPhoneNumberFormatterSpec` exists in `test/`), so this change does not introduce a new testing pattern. Verify manually via `sbt run` + curl, per Task 2's manual verification steps.
- Do not change behavior of the four existing notification call sites during the Task 1 refactor — only deduplicate the code that sends them.
- Money formatting must match the existing convention used in `sendCheckoutNotifications`: `f"₹${amount}%.2f"` (₹ symbol, 2 decimal places).
- The AwaitingPayment notification's checkout link must use the same pattern as `markReady`: `config.getOptional[String]("app.frontend.url").getOrElse("http://localhost:3000")` + `/checkout/{id}`.

---

### Task 1: Extract shared `notify` helper and migrate existing call sites

**Files:**
- Modify: `app/service/VisitService.scala`

**Interfaces:**
- Produces: `private def notify(visit: Visit, message: String, emailType: String, spot: Option[String] = None, price: Option[String] = None): Unit` — used by Task 2.

This task is a pure refactor: four existing inline blocks that each build a Kafka JSON payload and call `kafkaService.sendEmailNotification` / `sendSmsNotification` are replaced with calls to one shared helper. No message text, email type, or notification trigger changes.

- [ ] **Step 1: Add the `notify` helper**

In `app/service/VisitService.scala`, find the `// --- Internal Helpers ---` comment (currently around line 537, directly above `private def updateVisitStatus`). Add the new helper directly below that comment, before `updateVisitStatus`:

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

- [ ] **Step 2: Migrate `acknowledgeRequest`'s `RequestedCheckIn` branch**

Find this block inside `acknowledgeRequest` (the `case models.VisitStatus.RequestedCheckIn =>` branch):

```scala
                    _ <- {
                      val time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                      val location = "A%02d".format(slot.slotNumber)
                      val msg = s"your vehicle ${visit.vehicleNumber} has been accepted for check-in at $time and parked at $location"
                      
                      val payload = Json.obj(
                        "customerName" -> play.api.libs.json.JsString(visit.customerName),
                        "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
                        "message" -> play.api.libs.json.JsString(msg),
                        "emailType" -> play.api.libs.json.JsString("CHECKIN"),
                        "bookingId" -> play.api.libs.json.JsString(id.toString),
                        "spot" -> play.api.libs.json.JsString(location),
                        "price" -> play.api.libs.json.JsString("N/A - Check-in")
                      ).toString()
                      kafkaService.sendEmailNotification(payload)
                      visit.phoneNumber.foreach { phone =>
                        kafkaService.sendSmsNotification(phone, msg)
                      }
                      invalidateCache()
                    }
```

Replace it with:

```scala
                    _ <- {
                      val time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                      val location = "A%02d".format(slot.slotNumber)
                      val msg = s"your vehicle ${visit.vehicleNumber} has been accepted for check-in at $time and parked at $location"

                      notify(visit, msg, emailType = "CHECKIN", spot = Some(location), price = Some("N/A - Check-in"))
                      invalidateCache()
                    }
```

- [ ] **Step 3: Migrate `markReady`**

Find this block inside `markReady` (the `case models.VisitStatus.CheckedIn | models.VisitStatus.InProgress =>` branch):

```scala
                val locationOpt = visit.slotId.map(s => "D%02d".format(s)).getOrElse("unknown")
                val frontendUrl = config.getOptional[String]("app.frontend.url").getOrElse("http://localhost:3000")
                val checkoutUrl = s"$frontendUrl/checkout/$id"
                val msg = s"your vehicle ${visit.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt. You can checkout using this link: $checkoutUrl"
                
                val payload = Json.obj(
                  "customerName" -> play.api.libs.json.JsString(visit.customerName),
                  "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
                  "message" -> play.api.libs.json.JsString(msg),
                  "emailType" -> play.api.libs.json.JsString("UPDATE"),
                  "bookingId" -> play.api.libs.json.JsString(id.toString)
                ).toString()
                kafkaService.sendEmailNotification(payload)
                visit.phoneNumber.foreach { phone =>
                  kafkaService.sendSmsNotification(phone, msg)
                }
                invalidateCache().map(_ => res)
```

Replace it with:

```scala
                val locationOpt = visit.slotId.map(s => "D%02d".format(s)).getOrElse("unknown")
                val frontendUrl = config.getOptional[String]("app.frontend.url").getOrElse("http://localhost:3000")
                val checkoutUrl = s"$frontendUrl/checkout/$id"
                val msg = s"your vehicle ${visit.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt. You can checkout using this link: $checkoutUrl"

                notify(visit, msg, emailType = "UPDATE")
                invalidateCache().map(_ => res)
```

- [ ] **Step 4: Migrate `completeAddOn`**

Find this block inside `completeAddOn`:

```scala
          repo.updateStatus(id, models.VisitStatus.Ready).flatMap { _ =>
            repo.getById(id).map {
              case Some(v) => 
                val locationOpt = v.slotId.map(s => "D%02d".format(s)).getOrElse("unknown")
                val frontendUrl = config.getOptional[String]("app.frontend.url").getOrElse("http://localhost:3000")
                val checkoutUrl = s"$frontendUrl/checkout/${v.id}"
                val msg = s"your vehicle ${v.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt. You can checkout using this link: $checkoutUrl"
                
                val payload = Json.obj(
                  "customerName" -> play.api.libs.json.JsString(v.customerName),
                  "email" -> play.api.libs.json.JsString(v.email.getOrElse("")),
                  "message" -> play.api.libs.json.JsString(msg),
                  "emailType" -> play.api.libs.json.JsString("UPDATE"),
                  "bookingId" -> play.api.libs.json.JsString(v.id.toString)
                ).toString()
                kafkaService.sendEmailNotification(payload)
                v.phoneNumber.foreach { phone =>
                  kafkaService.sendSmsNotification(phone, msg)
                }
              case None =>
            }
            invalidateCache().map(_ => successMessage)
          }
```

Replace it with:

```scala
          repo.updateStatus(id, models.VisitStatus.Ready).flatMap { _ =>
            repo.getById(id).map {
              case Some(v) =>
                val locationOpt = v.slotId.map(s => "D%02d".format(s)).getOrElse("unknown")
                val frontendUrl = config.getOptional[String]("app.frontend.url").getOrElse("http://localhost:3000")
                val checkoutUrl = s"$frontendUrl/checkout/${v.id}"
                val msg = s"your vehicle ${v.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt. You can checkout using this link: $checkoutUrl"

                notify(v, msg, emailType = "UPDATE")
              case None =>
            }
            invalidateCache().map(_ => successMessage)
          }
```

- [ ] **Step 5: Migrate `sendCheckoutNotifications`**

Find the full method:

```scala
  private def sendCheckoutNotifications(visit: Visit, totalFee: Option[Double]): Unit = {
    val amountText = totalFee.map(f => f" Amount due: ₹${f}%.2f.").getOrElse("")
    val locationOpt = visit.slotId.map(s => "E%02d".format(s)).getOrElse("unknown")
    val message = s"your vehicle ${visit.vehicleNumber} has been succesfully checked-out from $locationOpt.$amountText Thank u for using our service"
    val payload = Json.obj(
      "customerName" -> play.api.libs.json.JsString(visit.customerName),
      "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
      "message" -> play.api.libs.json.JsString(message),
      "emailType" -> play.api.libs.json.JsString("CHECKOUT"),
      "bookingId" -> play.api.libs.json.JsString(visit.id.toString),
      "spot" -> play.api.libs.json.JsString(locationOpt),
      "price" -> play.api.libs.json.JsString(f"₹${totalFee.getOrElse(0.0)}%.2f")
    ).toString()
    kafkaService.sendEmailNotification(payload)
    visit.phoneNumber.foreach { phone =>
      kafkaService.sendSmsNotification(phone, message)
    }
  }
```

Replace it with:

```scala
  private def sendCheckoutNotifications(visit: Visit, totalFee: Option[Double]): Unit = {
    val amountText = totalFee.map(f => f" Amount due: ₹${f}%.2f.").getOrElse("")
    val locationOpt = visit.slotId.map(s => "E%02d".format(s)).getOrElse("unknown")
    val message = s"your vehicle ${visit.vehicleNumber} has been succesfully checked-out from $locationOpt.$amountText Thank u for using our service"
    notify(
      visit,
      message,
      emailType = "CHECKOUT",
      spot = Some(locationOpt),
      price = Some(f"₹${totalFee.getOrElse(0.0)}%.2f")
    )
  }
```

- [ ] **Step 6: Compile**

Run: `sbt compile`
Expected: `[success]` with no errors. Warnings about unused imports are fine (none expected — `Json` is still used inside `notify`).

- [ ] **Step 7: Manual verification — confirm existing behavior is unchanged**

Start the app (`sbt run`, or `docker-compose up --build` if using Docker) and Mailpit at `http://localhost:8025`. Run through the existing lifecycle using curl (adjust host/port if needed):

```bash
# Check-in
curl -s -X POST -H "X-User-Role: Service Advisor" -H "Content-Type: application/json" \
  -d '{"vehicleNumber": "TEST01", "customerName": "Test User", "status": "CheckedIn", "email": "test@example.com", "phoneNumber": "9999999999", "vehicleType": "Sedan"}' \
  http://localhost:9000/api/user/visits/check-in

# Note the returned visit id as $ID, then acknowledge check-in (Valet)
curl -s -X POST -H "X-User-Role: Valet" http://localhost:9000/api/valet/visits/$ID/acknowledge

# Mark ready (Valet)
curl -s -X POST -H "X-User-Role: Valet" http://localhost:9000/api/valet/visits/$ID/ready
```

Expected: a "CHECKIN" email appears in Mailpit after the acknowledge call, and an "UPDATE" email with a checkout link appears after the ready call — same content/format as before this refactor. Confirm no exceptions in the `sbt run` console.

- [ ] **Step 8: Commit**

```bash
git add app/service/VisitService.scala
git commit -m "$(cat <<'EOF'
Extract shared notify helper in VisitService

Deduplicates the Kafka email/SMS payload-building code that was
copy-pasted across four notification call sites. No behavior change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Notify customer and invalidate cache when checkout is approved

**Files:**
- Modify: `app/service/VisitService.scala`

**Interfaces:**
- Consumes: `notify(visit: Visit, message: String, emailType: String, spot: Option[String] = None, price: Option[String] = None): Unit` (from Task 1); `calculateBill(id: Long): Future[Bill]` (existing, returns `Bill(visitId, durationHours, baseRate, surgeMultiplier, totalFee: Double)`); `invalidateCache(): Future[Unit]` (existing).

- [ ] **Step 1: Update `acceptCheckoutRequest`**

Find the method:

```scala
  def acceptCheckoutRequest(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) if visit.status == models.VisitStatus.RequestedCheckout =>
        repo.updateStatus(id, models.VisitStatus.AwaitingPayment).flatMap { res =>
          Future.successful(res)
        }

      case Some(_) =>
        Future.failed(new Exception("Vehicle can only be accepted for checkout if it has been requested"))

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }
```

Replace it with:

```scala
  def acceptCheckoutRequest(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) if visit.status == models.VisitStatus.RequestedCheckout =>
        repo.updateStatus(id, models.VisitStatus.AwaitingPayment).flatMap { res =>
          calculateBill(id).flatMap { bill =>
            val frontendUrl = config.getOptional[String]("app.frontend.url").getOrElse("http://localhost:3000")
            val checkoutUrl = s"$frontendUrl/checkout/$id"
            val amount = f"₹${bill.totalFee}%.2f"
            val msg = s"your vehicle ${visit.vehicleNumber} checkout has been approved. Amount due: $amount. Complete your payment here: $checkoutUrl"
            notify(visit, msg, emailType = "UPDATE", price = Some(amount))
            invalidateCache().map(_ => res)
          }
        }

      case Some(_) =>
        Future.failed(new Exception("Vehicle can only be accepted for checkout if it has been requested"))

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }
```

Note: `visit` here is the visit as fetched *before* the status update — its `status` field will still read `RequestedCheckout` in memory, but only `vehicleNumber`, `customerName`, `email`, `phoneNumber`, `slotId` are used for the message, and none of those change during this transition, so this is safe.

- [ ] **Step 2: Compile**

Run: `sbt compile`
Expected: `[success]` with no errors.

- [ ] **Step 3: Manual verification — new notification fires on checkout approval**

Continuing from a visit in the `Ready` state (or repeat Task 1's curl sequence up to `ready`), drive it to `AwaitingPayment`:

```bash
# Customer requests checkout (public endpoint)
curl -s -X POST http://localhost:9000/api/visits/$ID/request-checkout

# Valet approves the checkout request
curl -s -X POST -H "X-User-Role: Valet" http://localhost:9000/api/valet/visits/$ID/accept-checkout
```

Expected:
- The `accept-checkout` response is `200 OK` with the existing `"message": "Checkout accepted for visit $ID. Awaiting payment."` body.
- An "UPDATE" email appears in Mailpit containing the visit's vehicle number, an amount due formatted as `₹<number>.00`, and a `/checkout/$ID` link.
- The `sbt run` console shows no exceptions.
- If you have the admin dashboard open (`http://localhost:9000/admin` or the React console), the visit's status updates to `AwaitingPayment` live without a manual page refresh — confirming the added `invalidateCache()` call is working (this did not happen before this change).

- [ ] **Step 4: Verify checkout still completes correctly end-to-end**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"visitId\": $ID}" \
  http://localhost:9000/api/webhook/payment
```

Expected: `200 OK` with a `"message": "Payment successful, visit $ID checked out."` body, and a "CHECKOUT" email with a PDF receipt attached appears in Mailpit — confirming Task 1's refactor of `sendCheckoutNotifications` didn't break the final step of the flow.

- [ ] **Step 5: Commit**

```bash
git add app/service/VisitService.scala
git commit -m "$(cat <<'EOF'
Notify customer when valet approves checkout

Sends an email/SMS with the amount due and payment link when a visit
moves RequestedCheckout -> AwaitingPayment, and fixes a missing
invalidateCache() call on that same transition so dashboards update
live.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
