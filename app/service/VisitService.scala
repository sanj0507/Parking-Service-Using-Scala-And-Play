package service

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject._
import models.Visit
import repository.VisitRepository

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

@Singleton
class VisitService @Inject()(
    repo: VisitRepository
)(implicit ec: ExecutionContext) {
  def initialize(): Future[Unit] =
    repo.createTable()

  def checkIn(visit: Visit): Future[Int] = {
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

          val updatedVisit = visit.copy(createdAt = currentTime)
          repo.insert(updatedVisit)
      }
    }
  }

  def getVisits(): Future[Seq[Visit]] =
    repo.getAll()

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
    updateVisitStatus(
      id = id,
      expectedStatus = models.VisitStatus.Requested,
      nextStatus = models.VisitStatus.InProgress,
      errorMessage = "Vehicle can only be acknowledged from Requested status"
    )

  def acceptCheckoutRequest(id: Long): Future[Int] =
    updateVisitStatus(
      id = id,
      expectedStatus = models.VisitStatus.RequestedCheckout,
      nextStatus = models.VisitStatus.CheckedOut,
      errorMessage = "Vehicle can only be checked out after a checkout request"
    )

  def markReady(id: Long): Future[Int] =
    updateVisitStatus(
      id = id,
      expectedStatus = models.VisitStatus.InProgress,
      nextStatus = models.VisitStatus.Ready,
      errorMessage = "Vehicle can only be marked ready from InProgress status"
    )

  def addOn(id: Long, serviceName: String): Future[String] = {
    repo.getById(id).flatMap {
      case Some(visit) =>
        if (serviceName.trim.isEmpty) {
          Future.failed(new Exception("Service name is required"))
        } else if (visit.status == models.VisitStatus.CheckedOut) {
          Future.failed(new Exception("Cannot add services after check-out"))
        } else {
          Future.successful(
            s"Add-on service '$serviceName' recorded for visit $id"
          )
        }

      case None =>
        Future.failed(new Exception(s"Visit with id $id not found"))
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
  
}
