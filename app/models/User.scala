package models

import play.api.libs.json._

case class User(
  id: Long,
  username: String,
  email: String,
  passwordHash: String,
  role: String
)

object User {
  implicit val format: OFormat[User] = Json.format[User]
}
