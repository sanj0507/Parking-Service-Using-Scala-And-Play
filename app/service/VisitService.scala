package service

import javax.inject._
import models.Visit
import repository.VisitRepository

import scala.concurrent.Future

@Singleton
class VisitService @Inject()(repo: VisitRepository) {

  def initialize(): Future[Unit] =
    repo.createTable()

  def checkIn(visit: Visit): Future[Int] =
    repo.insert(visit)

  def getVisits(): Future[Seq[Visit]] =
    repo.getAll()
}