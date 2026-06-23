package models

import play.api.libs.json.{Json, OFormat}

case class Visit(
    id: Long = 0,
    vehicleNumber: String,
    customerName: String,
    status: String,
    createdAt: String = ""
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
      addOns = addOns
    )
}