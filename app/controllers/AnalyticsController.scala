package controllers

import javax.inject._
import actions.RoleAction
import models.Role
import play.api.libs.json._
import play.api.mvc._
import service.AnalyticsService

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

@Singleton
class AnalyticsController @Inject()(
  val controllerComponents: ControllerComponents,
  analyticsService: AnalyticsService,
  roleAction: RoleAction
)(implicit ec: ExecutionContext)
  extends BaseController {

  private def forbidden =
    Future.successful(Forbidden(Json.obj("error" -> "forbidden for this role")))

  private def allowed(role: Option[Role], roles: Set[Role]): Boolean =
    role.exists(roles.contains)

  def getMetrics = roleAction.async { request =>
    if (request.role.isEmpty) {
      Future.successful(Unauthorized(Json.obj("error" -> "missing or invalid X-User-Role header")))
    } else if (!allowed(request.role, Set(Role.Admin))) {
      forbidden
    } else {
      analyticsService.getDashboardMetrics().map { metrics =>
        Ok(metrics)
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }
}
