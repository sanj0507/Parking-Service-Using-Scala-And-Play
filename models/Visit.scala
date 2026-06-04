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