package controllers

import javax.inject._
import actions.RoleAction
import models.Role
import models.Visit
import play.api.libs.json._
import play.api.mvc._
import service.VisitService

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

@Singleton
class VisitController @Inject()(
  val controllerComponents: ControllerComponents,
  visitService: VisitService,
  roleAction: RoleAction
)(implicit ec: ExecutionContext)
  extends BaseController {

  visitService.initialize()

  private def unauthorized =
    Future.successful(Unauthorized(Json.obj("error" -> "missing or invalid X-User-Role header")))

  private def forbidden =
    Future.successful(Forbidden(Json.obj("error" -> "forbidden for this role")))

  private def allowed(role: Option[Role], roles: Set[Role]): Boolean =
    role.exists(roles.contains)

  def checkIn = roleAction.async(parse.json) { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      val json = request.body

      val visit = Visit(
        id = 0,
        vehicleNumber = (json \ "vehicleNumber").as[String],
        customerName = (json \ "customerName").as[String],
        status = (json \ "status").as[String]
      )

      visitService.checkIn(visit).map { _ =>
        Created(Json.obj(
          "message" -> "Vehicle checked in successfully"
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }

  def getAllVisits = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      visitService.getVisits().map { visits =>
        Ok(Json.obj(
          "count" -> visits.size,
          "data" -> visits
        ))
      }
    }
  }

  def getVisitById(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      visitService.getVisitById(id).map {
        case Some(visit) =>
          Ok(Json.toJson(visit))

        case None =>
          NotFound(Json.obj(
            "message" -> s"Visit with id $id not found"
          ))
      }
    }
  }

  def requestVehicle(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      visitService.requestVehicle(id).map { _ =>
        Ok(Json.obj(
          "message" -> s"Vehicle requested successfully for visit $id"
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }

  def requestCheckout(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      visitService.requestCheckout(id).map { _ =>
        Ok(Json.obj(
          "message" -> s"Checkout requested successfully for visit $id"
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }

  def acknowledgeRequest(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      visitService.acknowledgeRequest(id).map { _ =>
        Ok(Json.obj(
          "message" -> s"Vehicle request acknowledged successfully for visit $id"
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }

  def ready(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.Admin))) {
      forbidden
    } else {
      visitService.markReady(id).map { _ =>
        Ok(Json.obj(
          "message" -> s"Vehicle marked ready successfully for visit $id"
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }

  def addOn(id: Long) = roleAction.async(parse.json) { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      val json = request.body
      val serviceName = (json \ "service").as[String]

      visitService.addOn(id, serviceName).map { message =>
        Ok(Json.obj(
          "message" -> message
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }

  def checkOut(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.Admin))) {
      forbidden
    } else {
      visitService.checkOut(id).map { _ =>
        Ok(Json.obj(
          "message" -> s"Vehicle with id $id has been successfully checked out"
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }
}
