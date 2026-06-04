package models

sealed trait Role

object Role {
  case object Valet extends Role
  case object ServiceAdvisor extends Role
  case object Admin extends Role

  private def normalize(value: String): String =
    value.toLowerCase.replaceAll("[^a-z]", "")

  def fromString(s: String): Option[Role] = normalize(s) match {
    case "valet"             => Some(Valet)
    case "serviceadvisor"    => Some(ServiceAdvisor)
    case "admin"             => Some(Admin)
    case _                    => None
  }

  def label(role: Role): String = role match {
    case Valet           => "Valet"
    case ServiceAdvisor  => "Service Advisor"
    case Admin           => "Admin"
  }
}
