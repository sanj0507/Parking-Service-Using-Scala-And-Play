package actions

import javax.inject.Inject
import models.Role
import pdi.jwt.{JwtAlgorithm, JwtJson}
import play.api.Configuration
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Success, Failure}

class RoleRequest[A](val role: Option[Role], request: Request[A]) extends WrappedRequest[A](request)

class RoleAction @Inject()(bodyParser: BodyParsers.Default, config: Configuration)(implicit ec: ExecutionContext)
    extends ActionBuilder[RoleRequest, AnyContent]
    with ActionTransformer[Request, RoleRequest] {

  private val secretKey = config.getOptional[String]("play.http.secret.key").getOrElse("changeme_secret")

  override protected def transform[A](request: Request[A]): Future[RoleRequest[A]] = {
    val authHeader = request.headers.get("Authorization").getOrElse("")
    val roleStr = if (authHeader.startsWith("Bearer ")) {
      val token = authHeader.substring(7)
      JwtJson.decodeJson(token, secretKey, Seq(JwtAlgorithm.HS256)) match {
        case Success(claim) => (claim \ "role").asOpt[String].getOrElse("")
        case Failure(_) => ""
      }
    } else {
      ""
    }
    
    Future.successful(new RoleRequest(Role.fromString(roleStr), request))
  }

  override def parser: BodyParser[AnyContent] = bodyParser

  override protected def executionContext: ExecutionContext = ec
}
