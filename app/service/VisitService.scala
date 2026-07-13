package service

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject._
import models.{AddOnRequest, AddOnStatus, Visit, VisitWithAddOns}
import play.api.cache.AsyncCacheApi
import play.api.libs.json.Json
import repository.VisitRepository

import scala.concurrent.duration._

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

@Singleton
class VisitService @Inject()(
    repo: VisitRepository,
    cache: AsyncCacheApi,
    kafkaService: KafkaProducerService
)(implicit ec: ExecutionContext) {
  def initialize(): Future[Unit] =
    repo.createTable()

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

  //caching implementation with TTL 1hr
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
  //kafka implementation
  def acknowledgeRequest(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) =>
        visit.status match {
          case models.VisitStatus.RequestedCheckIn =>
            repo.updateStatus(id, models.VisitStatus.CheckedIn).flatMap { res =>
              val time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
              val payload = Json.obj(
                "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
                "message" -> play.api.libs.json.JsString(s"your vehicle ${visit.vehicleNumber} has been accepted for check-in at $time")
              ).toString()
              kafkaService.sendEmailNotification(payload)
              visit.phoneNumber.foreach { phone =>
                kafkaService.sendSmsNotification(phone, s"your vehicle ${visit.vehicleNumber} has been accepted for check-in at $time")
              }
              cache.remove("visits-with-addons").map(_ => res)
            }

          case models.VisitStatus.Requested =>
            repo.updateStatus(id, models.VisitStatus.InProgress).flatMap(res => cache.remove("visits-with-addons").map(_ => res))

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

  //kafka implementation
  def acceptCheckoutRequest(id: Long): Future[Int] =
    updateVisitStatus(
      id = id,
      expectedStatus = models.VisitStatus.RequestedCheckout,
      nextStatus = models.VisitStatus.CheckedOut,
      errorMessage = "Vehicle can only be checked out after a checkout request"
    ).flatMap { res =>
      repo.getById(id).map {
        case Some(visit) =>
          val payload = Json.obj(
            "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
            "message" -> play.api.libs.json.JsString(s"your vehicle ${visit.vehicleNumber} has been succesfully checked-out. Thank u for using our service")
          ).toString()
          kafkaService.sendEmailNotification(payload)
          visit.phoneNumber.foreach { phone =>
            kafkaService.sendSmsNotification(phone, s"your vehicle ${visit.vehicleNumber} has been succesfully checked-out. Thank u for using our service")
          }
        case None =>
      }
      Future.successful(res)
    }

  //kafka implementation
  def markReady(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) =>
        visit.status match {
          case models.VisitStatus.CheckedIn | models.VisitStatus.InProgress =>
            repo.updateStatus(id, models.VisitStatus.Ready).flatMap { res =>
              val payload = Json.obj(
                "email" -> play.api.libs.json.JsString(visit.email.getOrElse("")),
                "message" -> play.api.libs.json.JsString(s"your vehicle ${visit.vehicleNumber} has been serviced and is now ready for check-out")
              ).toString()
              kafkaService.sendEmailNotification(payload)
              visit.phoneNumber.foreach { phone =>
                kafkaService.sendSmsNotification(phone, s"your vehicle ${visit.vehicleNumber} has been serviced and is now ready for check-out")
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
                val payload = Json.obj(
                  "email" -> play.api.libs.json.JsString(v.email.getOrElse("")),
                  "message" -> play.api.libs.json.JsString(s"your vehicle ${v.vehicleNumber} has been serviced and is now ready for check-out")
                ).toString()
                kafkaService.sendEmailNotification(payload)
                v.phoneNumber.foreach { phone =>
                  kafkaService.sendSmsNotification(phone, s"your vehicle ${v.vehicleNumber} has been serviced and is now ready for check-out")
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

  def checkOut(id: Long): Future[Int] =
    acceptCheckoutRequest(id)

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
