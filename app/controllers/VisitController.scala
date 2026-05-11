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

  implicit val visitFormat = Json.format[Visit]

  visitService.initialize()

  def checkIn = Action.async(parse.json) { request =>

    val visit = request.body.as[Visit]

    visitService.checkIn(visit).map { _ =>
      Ok(Json.obj("message" -> "Vehicle checked in"))
    }
  }

  def getAllVisits = Action.async {

    visitService.getVisits().map { visits =>
      Ok(Json.toJson(visits))
    }
  }
}