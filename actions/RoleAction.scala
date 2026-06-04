package actions

import javax.inject.Inject
import models.Role
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

class RoleRequest[A](val role: Option[Role], request: Request[A]) extends WrappedRequest[A](request)

class RoleAction @Inject()(bodyParser: BodyParsers.Default)(implicit ec: ExecutionContext)
    extends ActionBuilder[RoleRequest, AnyContent]
    with ActionTransformer[Request, RoleRequest] {

  override protected def transform[A](request: Request[A]): Future[RoleRequest[A]] = {
    val roleHeader = request.headers.get("X-User-Role").getOrElse("")
    Future.successful(new RoleRequest(Role.fromString(roleHeader), request))
  }

  override def parser: BodyParser[AnyContent] = bodyParser

  override protected def executionContext: ExecutionContext = ec
}
