package models

import play.api.libs.json.{Json, OFormat}

case class ParkingSlot(
    id: Long = 0,
    zoneName: String,
    slotNumber: Int,
    status: String,
    vehicleType: String,
    hasChargingDock: Boolean,
    distanceFromEntrance: Int
)

object ParkingSlot {
  implicit val format: OFormat[ParkingSlot] = Json.format[ParkingSlot]
}
