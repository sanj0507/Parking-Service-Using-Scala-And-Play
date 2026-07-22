package controllers

import javax.inject._
import actions.RoleAction
import models.{Role, Visit, Bill}
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

  // --- Visit Operations ---
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
        status = (json \ "status").as[String],
        email = (json \ "email").asOpt[String].filter(_.trim.nonEmpty),
        phoneNumber = (json \ "phoneNumber").asOpt[String].filter(_.trim.nonEmpty),
        vehicleType = (json \ "vehicleType").as[String]
      )

      visitService.checkIn(visit).map { generatedId =>
        Created(Json.obj(
          "id" -> generatedId,
          "message" -> s"Check-in request created successfully with ID $generatedId"
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
    } else if (!allowed(request.role, Set(Role.Valet, Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      visitService.getVisitsWithAddOns().map { visits =>
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

  // --- Vehicle Workflow ---
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
          "message" -> s"Vehicle request approved successfully for visit $id"
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

  // --- Add-On Services ---
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

  def getAddOns(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.ServiceAdvisor, Role.Admin))) {
      forbidden
    } else {
      visitService.getAddOns(id).map { addOns =>
        Ok(Json.obj(
          "count" -> addOns.size,
          "data" -> addOns
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }

  def startAddOn(id: Long) = roleAction.async(parse.json) { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.Admin))) {
      forbidden
    } else {
      val serviceName = (request.body \ "service").as[String]

      visitService.startAddOn(id, serviceName).map { message =>
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

  def completeAddOn(id: Long) = roleAction.async(parse.json) { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.Admin))) {
      forbidden
    } else {
      val serviceName = (request.body \ "service").as[String]

      visitService.completeAddOn(id, serviceName).map { message =>
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

  // --- Checkout ---
  def checkOut(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.Admin))) {
      forbidden
    } else {
      visitService.finalizeCheckout(id).map { _ =>
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

  def acceptCheckout(id: Long) = roleAction.async { request =>
    if (request.role.isEmpty) {
      unauthorized
    } else if (!allowed(request.role, Set(Role.Valet, Role.Admin))) {
      forbidden
    } else {
      visitService.acceptCheckoutRequest(id).map { _ =>
        Ok(Json.obj(
          "message" -> s"Checkout accepted for visit $id. Awaiting payment."
        ))
      }.recover {
        case ex: Exception =>
          BadRequest(Json.obj(
            "error" -> ex.getMessage
          ))
      }
    }
  }
  def getBill(id: Long) = Action.async { request =>
    visitService.getVisitById(id).flatMap {
      case Some(visit) =>
        visitService.calculateBill(id).map { bill =>
          Ok(Json.toJson(bill).as[JsObject] ++ Json.obj("status" -> visit.status))
        }
      case None =>
        Future.successful(NotFound(Json.obj("error" -> s"Visit with id $id not found")))
    }.recover {
      case ex: Exception =>
        BadRequest(Json.obj("error" -> ex.getMessage))
    }
  }

  def publicRequestCheckout(id: Long) = Action.async { request =>
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


  def paymentWebhook() = Action.async(parse.json) { request =>
    val visitId = (request.body \ "visitId").asOpt[Long]
    visitId match {
      case Some(id) =>
        visitService.calculateBill(id).flatMap { bill =>
          visitService.finalizeCheckout(id).map { _ =>
            Ok(Json.obj(
              "message" -> s"Payment successful, visit $id checked out.",
              "totalFee" -> bill.totalFee,
              "durationHours" -> bill.durationHours
            ))
          }
        }.recover {
          case ex: Exception => BadRequest(Json.obj("error" -> ex.getMessage))
        }
      case None => Future.successful(BadRequest(Json.obj("error" -> "Missing visitId")))
    }
  }

  def setSurge() = roleAction.async(parse.json) { request =>
    if (!allowed(request.role, Set(Role.Admin))) {
      forbidden
    } else {
      val multiplier = (request.body \ "multiplier").asOpt[Double]
      multiplier match {
        case Some(m) =>
          visitService.setSurgeMultiplier(m).map { _ =>
            Ok(Json.obj("message" -> s"Surge multiplier updated to $m"))
          }
        case None => Future.successful(BadRequest(Json.obj("error" -> "Missing multiplier")))
      }
    }
  }
}
