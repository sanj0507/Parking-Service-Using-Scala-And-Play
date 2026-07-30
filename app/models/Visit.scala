package models

import play.api.libs.json.{Json, OFormat}

case class Visit(
    id: Long = 0,
    vehicleNumber: String,
    customerName: String,
    status: String,
    createdAt: String = "",
    email: Option[String] = None,
    phoneNumber: Option[String] = None,
    vehicleType: String,
    slotId: Option[Long] = None,
    checkoutAt: Option[String] = None,
    totalFee: Option[Double] = None,
    requestedAt: Option[String] = None,
    readyAt: Option[String] = None
)

object Visit {
  implicit val format: OFormat[Visit] = Json.format[Visit]
}

case class VisitWithAddOns(
    id: Long,
    vehicleNumber: String,
    customerName: String,
    status: String,
    createdAt: String,
    email: Option[String],
    phoneNumber: Option[String],
    vehicleType: String,
    slotId: Option[Long],
    checkoutAt: Option[String],
    totalFee: Option[Double],
    requestedAt: Option[String],
    readyAt: Option[String],
    addOns: Seq[AddOnRequest]
)

object VisitWithAddOns {
  implicit val format: OFormat[VisitWithAddOns] = Json.format[VisitWithAddOns]

  def apply(visit: Visit, addOns: Seq[AddOnRequest]): VisitWithAddOns =
    VisitWithAddOns(
      id = visit.id,
      vehicleNumber = visit.vehicleNumber,
      customerName = visit.customerName,
      status = visit.status,
      createdAt = visit.createdAt,
      email = visit.email,
      phoneNumber = visit.phoneNumber,
      vehicleType = visit.vehicleType,
      slotId = visit.slotId,
      checkoutAt = visit.checkoutAt,
      totalFee = visit.totalFee,
      requestedAt = visit.requestedAt,
      readyAt = visit.readyAt,
      addOns = addOns
    )
}

case class Bill(
    visitId: Long,
    durationHours: Double,
    baseRate: Double,
    surgeMultiplier: Double,
    totalFee: Double
)

object Bill {
  implicit val format: OFormat[Bill] = Json.format[Bill]
}