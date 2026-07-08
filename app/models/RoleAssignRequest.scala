package models

import play.api.libs.json._

case class RoleAssignRequest(
  role: String
)

object RoleAssignRequest {
  implicit val format: OFormat[RoleAssignRequest] = Json.format[RoleAssignRequest]
}
