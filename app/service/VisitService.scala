package service

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject._
import models.{AddOnRequest, AddOnStatus, Visit, VisitWithAddOns, Bill}
import play.api.cache.AsyncCacheApi
import play.api.libs.json.Json
import repository.VisitRepository

import scala.concurrent.duration._

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

@Singleton
class VisitService @Inject()(
    repo: VisitRepository,
    slotRepo: repository.ParkingSlotRepository,
    cache: AsyncCacheApi,
    kafkaService: KafkaProducerService
)(implicit ec: ExecutionContext) {
  def initialize(): Future[Unit] =
    for {
      _ <- repo.createTable()
      _ <- slotRepo.createTable()
      slotCount <- slotRepo.count()
      _ <- if (slotCount == 0) seedParkingSlots() else Future.successful(())
      activeVisitCount <- repo.countActiveVisits()
      _ <- if (activeVisitCount == 0) seedVisitEntries() else Future.successful(())
    } yield ()

  private def seedParkingSlots(): Future[Unit] = {
    val zones = Seq("A", "B", "C", "D", "E")
    val vehicleTypes = Seq("Compact", "Sedan", "SUV", "EV")
    val slots = for {
      (zone, zIndex) <- zones.zipWithIndex
      slotNum <- 1 to 15
    } yield {
      val distance = (zIndex * 15) + slotNum
      val isEv = slotNum % 4 == 0 // Every 4th slot is EV
      val vType = if (isEv) "EV" else vehicleTypes(slotNum % 3)
      models.ParkingSlot(
        id = 0,
        zoneName = zone,
        slotNumber = slotNum,
        status = "Available",
        vehicleType = vType,
        hasChargingDock = isEv,
        distanceFromEntrance = distance
      )
    }
    slotRepo.insertBatch(slots).map(_ => ())
  }

  private def seedVisitEntries(): Future[Unit] = {
    val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
    val now = LocalDateTime.now()

    val visits = Seq(
      Visit(
        id = 0,
        vehicleNumber = "TN01AB1234",
        customerName = "Ravi Kumar",
        status = models.VisitStatus.CheckedIn,
        createdAt = now.minusMinutes(30).format(formatter),
        email = Some("ravi.kumar@example.com"),
        phoneNumber = Some("9876543210"),
        vehicleType = "Compact",
        slotId = Some(1)
      ),
      Visit(
        id = 0,
        vehicleNumber = "TN02CD5678",
        customerName = "Priya Shah",
        status = models.VisitStatus.Ready,
        createdAt = now.minusHours(1).format(formatter),
        email = Some("priya.shah@example.com"),
        phoneNumber = Some("9123456780"),
        vehicleType = "Sedan",
        slotId = Some(2)
      ),
      Visit(
        id = 0,
        vehicleNumber = "TN03EF9012",
        customerName = "Arjun Patel",
        status = models.VisitStatus.InProgress,
        createdAt = now.minusMinutes(45).format(formatter),
        email = Some("arjun.patel@example.com"),
        phoneNumber = Some("9988776655"),
        vehicleType = "SUV",
        slotId = Some(3)
      ),
      Visit(
        id = 0,
        vehicleNumber = "TN04GH3456",
        customerName = "Sana Iyer",
        status = models.VisitStatus.Requested,
        createdAt = now.minusMinutes(20).format(formatter),
        email = Some("sana.iyer@example.com"),
        phoneNumber = Some("9012345678"),
        vehicleType = "EV",
        slotId = Some(4)
      ),
      Visit(
        id = 0,
        vehicleNumber = "TN05IJ7890",
        customerName = "Deepak Verma",
        status = models.VisitStatus.RequestedCheckout,
        createdAt = now.minusHours(2).format(formatter),
        email = Some("deepak.verma@example.com"),
        phoneNumber = Some("9765432100"),
        vehicleType = "Sedan",
        slotId = Some(5)
      ),
      Visit(
        id = 0,
        vehicleNumber = "TN06KL2345",
        customerName = "Maya Reddy",
        status = models.VisitStatus.CheckedIn,
        createdAt = now.minusMinutes(10).format(formatter),
        email = Some("maya.reddy@example.com"),
        phoneNumber = Some("9876501234"),
        vehicleType = "Compact",
        slotId = Some(6)
      )
    )

    for {
      _ <- Future.sequence(visits.map(repo.insert)).map(_ => ())
      _ <- slotRepo.updateStatus(1, "Occupied")
      _ <- slotRepo.updateStatus(2, "Occupied")
      _ <- slotRepo.updateStatus(3, "Occupied")
      _ <- slotRepo.updateStatus(4, "Occupied")
      _ <- slotRepo.updateStatus(5, "Occupied")
      _ <- slotRepo.updateStatus(6, "Occupied")
    } yield ()
  }

  // --- Visit Operations ---
  def checkIn(visit: Visit): Future[Long] = {
    if (!models.VisitStatus.allStatuses.contains(visit.status)) {
      Future.failed(new Exception("Invalid visit status"))
    } else {
      repo.findActiveVisitByVehicle(visit.vehicleNumber).flatMap {
        case Some(_) =>
          Future.failed(
            new Exception(
              s"Vehicle ${visit.vehicleNumber} already has an active visit"
            )
          )

        case None =>
          val currentTime = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))

          val updatedVisit = visit.copy(
            status = models.VisitStatus.RequestedCheckIn,
            createdAt = currentTime
          )
          repo.insert(updatedVisit).flatMap { id =>
            cache.remove("visits-with-addons").map(_ => id)
          }
      }
    }
  }

  def getVisits(): Future[Seq[Visit]] =
    repo.getAll()

  def getVisitsWithAddOns(): Future[Seq[VisitWithAddOns]] = {
    cache.getOrElseUpdate("visits-with-addons", 1.hour) {
      for {
        allVisits <- repo.getAll()
        allAddOns <- repo.getAllAddOns()
      } yield {
        val addOnsByVisit = allAddOns.groupBy(_.visitId)
        allVisits.map { v =>
          VisitWithAddOns(v, addOnsByVisit.getOrElse(v.id, Seq.empty))
        }
      }
    }
  }

  def getVisitById(id: Long): Future[Option[Visit]] =
    repo.getById(id)

  def requestVehicle(id: Long): Future[Int] =
    updateVisitStatus(
      id = id,
      expectedStatus = models.VisitStatus.CheckedIn,
      nextStatus = models.VisitStatus.Requested,
      errorMessage = "Vehicle can only be requested from CheckedIn status"
    )

  def requestCheckout(id: Long): Future[Int] =
    updateVisitStatus(
      id = id,
      expectedStatus = models.VisitStatus.Ready,
      nextStatus = models.VisitStatus.RequestedCheckout,
      errorMessage = "Vehicle can only request checkout from Ready status"
    )
  // --- Workflow & Notifications ---
  def acknowledgeRequest(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) =>
        visit.status match {
          case models.VisitStatus.RequestedCheckIn =>
            repo.getAddOnsByVisitId(id).flatMap { addOns =>
              val needsCharging = addOns.exists(_.serviceName.equalsIgnoreCase("Charge Vehicle")) || visit.vehicleType.equalsIgnoreCase("EV")
              slotRepo.findAvailableSlot(visit.vehicleType, needsCharging).flatMap {
                case Some(slot) =>
                  for {
                    _ <- slotRepo.updateStatus(slot.id, "Occupied")
                    _ <- repo.updateSlot(id, Some(slot.id))
                    res <- repo.updateStatus(id, models.VisitStatus.CheckedIn)
                    _ <- {
                      val time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                      val location = "A%02d".format(slot.slotNumber)
                      val payload = Json.obj(
                        "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
                        "message" -> play.api.libs.json.JsString(s"your vehicle ${visit.vehicleNumber} has been accepted for check-in at $time and parked at $location")
                      ).toString()
                      kafkaService.sendEmailNotification(payload)
                      visit.phoneNumber.foreach { phone =>
                        kafkaService.sendSmsNotification(phone, s"your vehicle ${visit.vehicleNumber} has been accepted for check-in at $time and parked at $location")
                      }
                      cache.remove("visits-with-addons")
                    }
                  } yield res

                case None =>
                  Future.failed(new Exception(s"No available parking slot for vehicle type ${visit.vehicleType}"))
              }
            }

          case models.VisitStatus.Requested =>
            val freeSlotFuture = visit.slotId match {
              case Some(sId) =>                  for {
                    _ <- slotRepo.updateStatus(sId, "Available")
                    _ <- repo.updateSlot(id, None)
                  } yield ()
              case None => Future.successful(())
            }
            freeSlotFuture.flatMap { _ =>
              repo.updateStatus(id, models.VisitStatus.InProgress).flatMap(res => cache.remove("visits-with-addons").map(_ => res))
            }

          case _ =>
            Future.failed(
              new Exception(
                "Vehicle can only be acknowledged from RequestedCheckIn or Requested status"
              )
            )
        }

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }

  private def sendCheckoutNotifications(visit: Visit, totalFee: Option[Double]): Unit = {
    val amountText = totalFee.map(f => f" Amount due: $$${f}%.2f.").getOrElse("")
    val locationOpt = visit.slotId.map(s => "E%02d".format(s)).getOrElse("unknown")
    val message = s"your vehicle ${visit.vehicleNumber} has been succesfully checked-out from $locationOpt.$amountText Thank u for using our service"
    val payload = Json.obj(
      "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
      "message" -> play.api.libs.json.JsString(message)
    ).toString()
    kafkaService.sendEmailNotification(payload)
    visit.phoneNumber.foreach { phone =>
      kafkaService.sendSmsNotification(phone, message)
    }
  }

  def acceptCheckoutRequest(id: Long, totalFee: Option[Double] = None): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) if visit.status == models.VisitStatus.RequestedCheckout =>
        val freeSlotFuture = visit.slotId match {
          case Some(slotId) =>
            slotRepo.updateStatus(slotId, "Available").flatMap(_ => repo.updateSlot(id, None))
          case None =>
            Future.successful(())
        }

        freeSlotFuture.flatMap { _ =>
          repo.updateStatus(id, models.VisitStatus.CheckedOut).flatMap { res =>
            sendCheckoutNotifications(visit, totalFee)
            Future.successful(res)
          }
        }

      case Some(_) =>
        Future.failed(new Exception("Vehicle can only be checked out after a checkout request"))

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }

  def markReady(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) =>
        visit.status match {
          case models.VisitStatus.CheckedIn | models.VisitStatus.InProgress =>
            repo.updateStatus(id, models.VisitStatus.Ready).flatMap { res =>
              val locationOpt = visit.slotId.map(s => "D%02d".format(s)).getOrElse("unknown")
              val payload = Json.obj(
                "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
                "message" -> play.api.libs.json.JsString(s"your vehicle ${visit.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt")
              ).toString()
              kafkaService.sendEmailNotification(payload)
              visit.phoneNumber.foreach { phone =>
                kafkaService.sendSmsNotification(phone, s"your vehicle ${visit.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt")
              }
              cache.remove("visits-with-addons").map(_ => res)
            }

          case models.VisitStatus.Ready =>
            Future.successful(1)

          case _ =>
            Future.failed(
              new Exception(
                "Vehicle can only be marked ready after it is checked in"
              )
            )
        }

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }

  // --- Add-On Services ---
  def addOn(id: Long, serviceName: String): Future[String] = {
    val normalizedServiceName = serviceName.trim

    repo.getById(id).flatMap {
      case Some(visit) =>
        if (normalizedServiceName.isEmpty) {
          Future.failed(new Exception("Service name is required"))
        } else if (visit.status == models.VisitStatus.CheckedOut) {
          Future.failed(new Exception("Cannot add services after check-out"))
        } else {
          val currentTime = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))

          repo.insertAddOn(
            AddOnRequest(
              visitId = id,
              serviceName = normalizedServiceName,
              status = AddOnStatus.Requested,
              createdAt = currentTime
            )
          ).flatMap(_ => cache.remove("visits-with-addons")).map(_ => s"Add-on service '$normalizedServiceName' requested for visit $id")
        }

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }
  }

  def getAddOns(id: Long): Future[Seq[AddOnRequest]] =
    repo.getById(id).flatMap {
      case Some(_) => repo.getAddOnsByVisitId(id)
      case None    => Future.failed(new Exception(s"Visit with id $id not found"))
    }

  def startAddOn(id: Long, serviceName: String): Future[String] = {
    repo.getById(id).flatMap {
      case Some(visit) =>
        if (visit.status == models.VisitStatus.CheckedOut || visit.status == models.VisitStatus.RequestedCheckIn) {
          Future.failed(new Exception("Add-on service can only start after the vehicle is checked in and before checkout"))
        } else {
          updateAddOnStatus(
            id = id,
            serviceName = serviceName,
            expectedStatus = AddOnStatus.Requested,
            nextStatus = AddOnStatus.InProgress,
            errorMessage = "Add-on can only be started from RequestedAddOn status"
          ).flatMap { successMessage =>
            repo.updateStatus(id, models.VisitStatus.InProgress).flatMap { _ =>
              cache.remove("visits-with-addons").map(_ => successMessage)
            }
          }
        }
      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }
  }

  def completeAddOn(id: Long, serviceName: String): Future[String] = {
    updateAddOnStatus(
      id = id,
      serviceName = serviceName,
      expectedStatus = AddOnStatus.InProgress,
      nextStatus = AddOnStatus.Completed,
      errorMessage = "Add-on can only be completed from AddOnInProgress status"
    ).flatMap { successMessage =>
      repo.getAddOnsByVisitId(id).flatMap { addOns =>
        val hasIncomplete = addOns.exists(a => a.status == AddOnStatus.Requested || a.status == AddOnStatus.InProgress)
        if (!hasIncomplete) {
          repo.updateStatus(id, models.VisitStatus.Ready).flatMap { _ =>
            repo.getById(id).map {
              case Some(v) => 
                val locationOpt = v.slotId.map(s => "D%02d".format(s)).getOrElse("unknown")
                val payload = Json.obj(
                  "email" -> play.api.libs.json.JsString(v.email.getOrElse("")),
                  "message" -> play.api.libs.json.JsString(s"your vehicle ${v.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt")
                ).toString()
                kafkaService.sendEmailNotification(payload)
                v.phoneNumber.foreach { phone =>
                  kafkaService.sendSmsNotification(phone, s"your vehicle ${v.vehicleNumber} has been serviced and is now ready for check-out at $locationOpt")
                }
              case None =>
            }
            cache.remove("visits-with-addons").map(_ => successMessage)
          }
        } else {
          Future.successful(successMessage)
        }
      }
    }
  }

  def calculateBill(id: Long): Future[Bill] = {
    repo.getById(id).flatMap {
      case Some(visit) =>
        cache.getOrElseUpdate("surge_multiplier", 1.hour)(Future.successful(1.0)).map { surgeMultiplier =>
          val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
          val createdAt = LocalDateTime.parse(visit.createdAt, formatter)
          val now = LocalDateTime.now()
          val minutes = ChronoUnit.MINUTES.between(createdAt, now)
          val hours = Math.max(1.0, minutes / 60.0)
          val baseRate = 5.0
          val totalFee = hours * baseRate * surgeMultiplier
          Bill(id, hours, baseRate, surgeMultiplier, totalFee)
        }
      case None => Future.failed(new Exception(s"Visit with id $id not found"))
    }
  }

  def finalizeCheckout(id: Long): Future[Int] = {
    repo.getById(id).flatMap {
      case Some(visit) if visit.status == models.VisitStatus.RequestedCheckout || visit.status == models.VisitStatus.Ready =>
        calculateBill(id).flatMap { bill =>
          val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
          val checkoutAt = LocalDateTime.now().format(formatter)
          repo.updateCheckoutDetails(id, checkoutAt, bill.totalFee).flatMap { _ =>
            if (visit.status == models.VisitStatus.Ready) {
              repo.updateStatus(id, models.VisitStatus.RequestedCheckout).flatMap(_ => acceptCheckoutRequest(id, Some(bill.totalFee)))
            } else {
              acceptCheckoutRequest(id, Some(bill.totalFee))
            }
          }
        }

      case Some(_) =>
        Future.failed(new Exception("Vehicle can only be checked out after a checkout request or once it is ready for checkout"))

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }
  }

  def setSurgeMultiplier(multiplier: Double): Future[Unit] = {
    cache.set("surge_multiplier", multiplier, 1.hour)
    Future.successful(())
  }

  def checkOut(id: Long): Future[Int] =
    finalizeCheckout(id)

  // --- Internal Helpers ---
  private def updateVisitStatus(
      id: Long,
      expectedStatus: String,
      nextStatus: String,
      errorMessage: String
  ): Future[Int] = {
    repo.getById(id).flatMap {
      case Some(visit) =>
        if (visit.status != expectedStatus) {
          Future.failed(new Exception(errorMessage))
        } else {
          repo.updateStatus(id, nextStatus).flatMap(res => cache.remove("visits-with-addons").map(_ => res))
        }

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
    }
  }

  private def updateAddOnStatus(
      id: Long,
      serviceName: String,
      expectedStatus: String,
      nextStatus: String,
      errorMessage: String
  ): Future[String] = {
    val normalizedServiceName = serviceName.trim

    if (normalizedServiceName.isEmpty) {
      Future.failed(new Exception("Service name is required"))
    } else {
      repo.updateAddOnStatus(
        visitId = id,
        serviceName = normalizedServiceName,
        expectedStatus = expectedStatus,
        nextStatus = nextStatus
      ).flatMap {
        case updated if updated > 0 =>
          cache.remove("visits-with-addons").map(_ => s"Add-on service '$normalizedServiceName' moved to $nextStatus for visit $id")

        case _ =>
          Future.failed(new Exception(errorMessage))
      }
    }
  }

}
