package controllers

import javax.inject._
import models.LoginRequest
import play.api.libs.json._
import play.api.mvc._
import service.UserService

import scala.concurrent.ExecutionContext

@Singleton
class AuthController @Inject()(
  val controllerComponents: ControllerComponents,
  userService: UserService
)(implicit ec: ExecutionContext) extends BaseController {

  // Initialize table and seed users
  userService.initialize()

  def login = Action.async(parse.json) { request =>
    request.body.validate[LoginRequest].fold(
      errors => {
        scala.concurrent.Future.successful(BadRequest(Json.obj("error" -> "Invalid request payload")))
      },
      loginReq => {
        userService.authenticate(loginReq).map {
          case Some(token) => Ok(Json.obj("token" -> token, "message" -> "Login successful", "username" -> loginReq.username))
          case None => Unauthorized(Json.obj("error" -> "Invalid credentials or pending approval"))
        }
      }
    )
  }

  def signup = Action.async(parse.json) { request =>
    request.body.validate[models.SignupRequest].fold(
      errors => {
        scala.concurrent.Future.successful(BadRequest(Json.obj("error" -> "Invalid request payload")))
      },
      signupReq => {
        userService.signup(signupReq).map { _ =>
          Ok(Json.obj("message" -> "Your request has been sent to admin"))
        }.recover {
          case e: Exception => BadRequest(Json.obj("error" -> e.getMessage))
        }
      }
    )
  }

  def getPendingUsers = Action.async { _ =>
    userService.getPendingUsers().map { users =>
      Ok(Json.toJson(users))
    }
  }

  def assignRole(id: Long) = Action.async(parse.json) { request =>
    request.body.validate[models.RoleAssignRequest].fold(
      errors => {
        scala.concurrent.Future.successful(BadRequest(Json.obj("error" -> "Invalid request payload")))
      },
      req => {
        userService.assignRole(id, req.role).map { res =>
          if (res > 0) Ok(Json.obj("message" -> s"Role assigned successfully for user $id"))
          else NotFound(Json.obj("error" -> "User not found"))
        }.recover {
          case e: Exception => BadRequest(Json.obj("error" -> e.getMessage))
        }
      }
    )
  }
}
