package service

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject._
import models.{AddOnRequest, AddOnStatus, Visit, VisitWithAddOns}
import repository.VisitRepository

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

@Singleton
class VisitService @Inject()(
    repo: VisitRepository
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
          repo.insert(updatedVisit)
      }
    }
  }

  def getVisits(): Future[Seq[Visit]] =
    repo.getAll()

  def getVisitsWithAddOns(): Future[Seq[VisitWithAddOns]] = {
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

  def acknowledgeRequest(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) =>
        visit.status match {
          case models.VisitStatus.RequestedCheckIn =>
            repo.updateStatus(id, models.VisitStatus.CheckedIn)

          case models.VisitStatus.Requested =>
            repo.updateStatus(id, models.VisitStatus.InProgress)

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

  def acceptCheckoutRequest(id: Long): Future[Int] =
    updateVisitStatus(
      id = id,
      expectedStatus = models.VisitStatus.RequestedCheckout,
      nextStatus = models.VisitStatus.CheckedOut,
      errorMessage = "Vehicle can only be checked out after a checkout request"
    )

  def markReady(id: Long): Future[Int] =
    repo.getById(id).flatMap {
      case Some(visit) =>
        visit.status match {
          case models.VisitStatus.CheckedIn | models.VisitStatus.InProgress =>
            repo.updateStatus(id, models.VisitStatus.Ready)

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
          ).map(_ => s"Add-on service '$normalizedServiceName' requested for visit $id")
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
        if (visit.status != models.VisitStatus.CheckedIn && visit.status != models.VisitStatus.InProgress) {
          Future.failed(new Exception("Add-on service can only start after the vehicle is checked in"))
        } else {
          updateAddOnStatus(
            id = id,
            serviceName = serviceName,
            expectedStatus = AddOnStatus.Requested,
            nextStatus = AddOnStatus.InProgress,
            errorMessage = "Add-on can only be started from RequestedAddOn status"
          ).flatMap { successMessage =>
            repo.updateStatus(id, models.VisitStatus.InProgress).map { _ =>
              successMessage
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
          repo.updateStatus(id, models.VisitStatus.Ready).map { _ =>
            successMessage
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
          repo.updateStatus(id, nextStatus)
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
          Future.successful(s"Add-on service '$normalizedServiceName' moved to $nextStatus for visit $id")

        case _ =>
          Future.failed(new Exception(errorMessage))
      }
    }
  }

}
