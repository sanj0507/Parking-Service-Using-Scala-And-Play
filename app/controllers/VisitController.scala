package controllers

import javax.inject._
import models.Visit
import play.api.libs.json._
import play.api.mvc._
import service.VisitService

import scala.concurrent.ExecutionContext

@Singleton
class VisitController @Inject()(
    val controllerComponents: ControllerComponents,
    visitService: VisitService
)(implicit ec: ExecutionContext)
    extends BaseController {

  visitService.initialize()

  def checkIn = Action.async(parse.json) { request =>
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

  def getAllVisits = Action.async {
    visitService.getVisits().map { visits =>
      Ok(Json.obj(
        "count" -> visits.size,
        "data" -> visits
      ))
    }
  }

  def getVisitById(id: Long) = Action.async {
    visitService.getVisitById(id).map {
      case Some(visit) =>
        Ok(Json.toJson(visit))

      case None =>
        NotFound(Json.obj(
          "message" -> s"Visit with id $id not found"
        ))
    }
  }

  def requestVehicle(id: Long) = Action.async {
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

  def acknowledgeRequest(id: Long) = Action.async {
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

  def ready(id: Long) = Action.async {
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

  def addOn(id: Long) = Action.async(parse.json) { request =>
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

  def checkOut(id: Long) = Action.async {
    visitService.checkOut(id).map { _ =>
      Ok(Json.obj(
        "message" -> s"Vehicle checked out successfully for visit $id"
      ))
    }.recover {
      case ex: Exception =>
        BadRequest(Json.obj(
          "error" -> ex.getMessage
        ))
    }
  }
}