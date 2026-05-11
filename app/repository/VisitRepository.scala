package repository

import javax.inject._
import models.Visit
import slick.jdbc.MySQLProfile.api._
import slick.jdbc.MySQLProfile
import play.api.db.slick.DatabaseConfigProvider
import scala.concurrent.{Future, ExecutionContext}

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

    def * =
      (id, vehicleNumber, customerName, status) <> ((Visit.apply _).tupled, Visit.unapply)
  }

  private val visits = TableQuery[VisitsTable]

  def createTable(): Future[Unit] =
    db.run(visits.schema.createIfNotExists)

  def insert(visit: Visit): Future[Int] =
    db.run(visits += visit)

  def getAll(): Future[Seq[Visit]] =
    db.run(visits.result)
}