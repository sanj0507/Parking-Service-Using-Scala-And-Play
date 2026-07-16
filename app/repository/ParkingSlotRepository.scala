package repository

import javax.inject._
import models.ParkingSlot
import play.api.db.slick.DatabaseConfigProvider
import slick.jdbc.MySQLProfile
import slick.jdbc.MySQLProfile.api._

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class ParkingSlotRepository @Inject()(
    dbConfigProvider: DatabaseConfigProvider
)(implicit ec: ExecutionContext) {
  private val dbConfig = dbConfigProvider.get[MySQLProfile]
  private val db = dbConfig.db

  class ParkingSlotsTable(tag: Tag)
      extends Table[ParkingSlot](tag, "parking_slots") {

    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def zoneName = column[String]("zone_name")
    def slotNumber = column[Int]("slot_number")
    def status = column[String]("status")
    def vehicleType = column[String]("vehicle_type")
    def hasChargingDock = column[Boolean]("has_charging_dock")
    def distanceFromEntrance = column[Int]("distance_from_entrance")

    def * =
      (id, zoneName, slotNumber, status, vehicleType, hasChargingDock, distanceFromEntrance) <> ((ParkingSlot.apply _).tupled, ParkingSlot.unapply)
  }

  val parkingSlots = TableQuery[ParkingSlotsTable]

  def createTable(): Future[Unit] =
    db.run(parkingSlots.schema.createIfNotExists)

  def count(): Future[Int] =
    db.run(parkingSlots.length.result)

  def insertBatch(slots: Seq[ParkingSlot]): Future[Option[Int]] =
    db.run(parkingSlots ++= slots)

  def insert(slot: ParkingSlot): Future[Long] =
    db.run((parkingSlots returning parkingSlots.map(_.id)) += slot)

  def findAvailableSlot(vehicleType: String, requiresCharging: Boolean): Future[Option[ParkingSlot]] = {
    val query = parkingSlots
      .filter(_.status === "Available")
      .filter(_.vehicleType === vehicleType)
      
    val withCharging = if (requiresCharging) {
      query.filter(_.hasChargingDock === true)
    } else {
      query
    }

    db.run(
      withCharging
        .sortBy(_.distanceFromEntrance.asc)
        .result
        .headOption
    )
  }

  def updateStatus(id: Long, status: String): Future[Int] =
    db.run(
      parkingSlots
        .filter(_.id === id)
        .map(_.status)
        .update(status)
    )

  def updateStatusBySlotNumber(slotNumber: Int, status: String): Future[Int] =
    db.run(
      parkingSlots
        .filter(_.slotNumber === slotNumber)
        .map(_.status)
        .update(status)
    )
}
