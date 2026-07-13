package repository

import javax.inject._
import models.{AddOnRequest, Visit}
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
    def email = column[Option[String]]("email")
    def phoneNumber = column[Option[String]]("phone_number")

    def * =
      (id, vehicleNumber, customerName, status, createdAt, email, phoneNumber) <> ((Visit.apply _).tupled, Visit.unapply)
  }

  class AddOnRequestsTable(tag: Tag)
      extends Table[AddOnRequest](tag, "add_on_requests") {

    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def visitId = column[Long]("visit_id")
    def serviceName = column[String]("service_name")
    def status = column[String]("status")
    def createdAt = column[String]("created_at")

    def * =
      (id, visitId, serviceName, status, createdAt) <> ((AddOnRequest.apply _).tupled, AddOnRequest.unapply)
  }

  private val visits = TableQuery[VisitsTable]
  private val addOnRequests = TableQuery[AddOnRequestsTable]

  def createTable(): Future[Unit] =
    db.run(DBIO.seq(
      visits.schema.createIfNotExists,
      addOnRequests.schema.createIfNotExists
    ))

  def insert(visit: Visit): Future[Long] =
    db.run((visits returning visits.map(_.id)) += visit)

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

  def insertAddOn(addOnRequest: AddOnRequest): Future[Int] =
    db.run(addOnRequests += addOnRequest)

  def getAddOnsByVisitId(visitId: Long): Future[Seq[AddOnRequest]] =
    db.run(addOnRequests.filter(_.visitId === visitId).result)

  def updateAddOnStatus(
      visitId: Long,
      serviceName: String,
      expectedStatus: String,
      nextStatus: String
  ): Future[Int] =
    db.run(
      addOnRequests
        .filter(addOn =>
          addOn.visitId === visitId &&
          addOn.serviceName === serviceName &&
          addOn.status === expectedStatus
        )
        .map(_.status)
        .update(nextStatus)
    )

  def getAllAddOns(): Future[Seq[AddOnRequest]] =
    db.run(addOnRequests.result)

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
