package models

import play.api.libs.json.{Json, OFormat}

case class AddOnRequest(
    id: Long = 0,
    visitId: Long,
    serviceName: String,
    status: String,
    createdAt: String = ""
)

object AddOnRequest {
  implicit val format: OFormat[AddOnRequest] = Json.format[AddOnRequest]
}
