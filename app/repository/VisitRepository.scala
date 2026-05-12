package repository

import javax.inject._
import models.Visit
import play.api.db.slick.DatabaseConfigProvider
import slick.jdbc.MySQLProfile
import slick.jdbc.MySQLProfile.api._

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class VisitRepository @Inject()(
    dbConfigProvider: DatabaseConfigProvider
)(implicit ec: ExecutionContext) {

  private val dbConfig = dbConfigProvider.get[MySQLProfile]

  private val db = dbConfig.db

  class VisitsTable(tag: Tag)
      extends Table[Visit](tag, "visits") {

    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)

    def vehicleNumber = column[String]("vehicle_number")

    def customerName = column[String]("customer_name")

    def status = column[String]("status")

    def createdAt = column[String]("created_at")

    def * =
      (id, vehicleNumber, customerName, status, createdAt) <> ((Visit.apply _).tupled, Visit.unapply)
  }

  private val visits = TableQuery[VisitsTable]

  def createTable(): Future[Unit] =
    db.run(visits.schema.createIfNotExists)

  def insert(visit: Visit): Future[Int] =
    db.run(visits += visit)

  def getAll(): Future[Seq[Visit]] =
    db.run(visits.result)

  def getById(id: Long): Future[Option[Visit]] =
    db.run(visits.filter(_.id === id).result.headOption)

    def updateStatus(id: Long, status: String): Future[Int] =
  db.run(
    visits
      .filter(_.id === id)
      .map(_.status)
      .update(status)
  )

  def findActiveVisitByVehicle(vehicleNumber: String): Future[Option[Visit]] =
  db.run(
    visits
      .filter(v =>
        v.vehicleNumber === vehicleNumber &&
        v.status =!= "CheckedOut"
      )
      .result
      .headOption
  )
}