package models

import play.api.libs.json._

case class SignupRequest(
  username: String,
  email: String,
  password: String
)

object SignupRequest {
  implicit val format: OFormat[SignupRequest] = Json.format[SignupRequest]
}
