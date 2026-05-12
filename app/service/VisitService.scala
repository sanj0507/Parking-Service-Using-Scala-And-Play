package service

import javax.inject._
import models.Visit
import repository.VisitRepository
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Singleton
class VisitService @Inject()(
    repo: VisitRepository
)(implicit ec: ExecutionContext) {
  def initialize(): Future[Unit] =
    repo.createTable()

  def checkIn(visit: Visit): Future[Int] = {

  if (!models.VisitStatus.allStatuses.contains(visit.status)) {

    Future.failed(
      new Exception("Invalid visit status")
    )

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
          createdAt = currentTime
        )

        repo.insert(updatedVisit)
    }
  }
}

  def getVisits(): Future[Seq[Visit]] =
    repo.getAll()

  def getVisitById(id: Long): Future[Option[Visit]] =
    repo.getById(id)

  
  def requestVehicle(id: Long): Future[Int] = {

  repo.getById(id).flatMap {

    case Some(visit) =>

      if (visit.status != models.VisitStatus.CheckedIn) {
        Future.failed(
          new Exception("Vehicle can only be requested from CheckedIn status")
        )
      } else {

        repo.updateStatus(
          id,
          models.VisitStatus.Requested
        )
      }

    case None =>
      Future.failed(
        new Exception(s"Visit with id $id not found")
      )
  }
}
}