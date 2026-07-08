package service

import java.time.Clock
import javax.inject._
import models.{LoginRequest, User}
import org.mindrot.jbcrypt.BCrypt
import pdi.jwt.{JwtAlgorithm, JwtJson, JwtClaim}
import play.api.Configuration
import play.api.cache.AsyncCacheApi
import play.api.libs.json.Json
import repository.UserRepository

import scala.concurrent.duration._

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class UserService @Inject()(
    repo: UserRepository,
    config: Configuration,
    cache: AsyncCacheApi,
    kafkaService: KafkaProducerService
)(implicit ec: ExecutionContext) {

  private val secretKey = config.getOptional[String]("play.http.secret.key").getOrElse("changeme_secret")
  implicit val clock: Clock = Clock.systemUTC

  private val initFuture: Future[Unit] = {
    repo.createTable().flatMap { _ =>
      repo.count().recover { case _ => 0 }.flatMap { count =>
        if (count == 0) {
          // Seed default users
          val users = Seq(
            User(0, "admin", "admin@test.com", BCrypt.hashpw("admin", BCrypt.gensalt()), "Admin"),
            User(0, "valet", "valet@test.com", BCrypt.hashpw("valet", BCrypt.gensalt()), "Valet"),
            User(0, "advisor", "advisor@test.com", BCrypt.hashpw("advisor", BCrypt.gensalt()), "Service Advisor")
          )
          Future.sequence(users.map(repo.insert)).map(_ => ())
        } else {
          Future.successful(())
        }
      }
    }
  }

  def initialize(): Future[Unit] = initFuture

  def authenticate(req: LoginRequest): Future[Option[String]] = {
    initFuture.flatMap { _ =>
      cache.getOrElseUpdate(s"user-${req.username}", 1.hour) {
        repo.findByUsername(req.username)
      }.map {
        case Some(user) if BCrypt.checkpw(req.password, user.passwordHash) && user.role != "Pending" =>
          val claim = JwtClaim(
            content = s"""{"email":"${user.email}", "role":"${user.role}"}""",
            expiration = Some(System.currentTimeMillis() / 1000 + 86400) // 1 day
          )
          Some(JwtJson.encode(claim, secretKey, JwtAlgorithm.HS256))
        case _ => None
      }
    }
  }

  def signup(req: models.SignupRequest): Future[Long] = {
    repo.findByUsername(req.username).flatMap {
      case Some(_) => Future.failed(new Exception("Username already exists"))
      case None =>
        repo.findByEmail(req.email).flatMap {
          case Some(_) => Future.failed(new Exception("Email already exists"))
          case None =>
            val newUser = User(
              id = 0,
              username = req.username,
              email = req.email,
              passwordHash = BCrypt.hashpw(req.password, BCrypt.gensalt()),
              role = "Pending"
            )
            repo.insert(newUser)
        }
    }
  }

  def getPendingUsers(): Future[Seq[User]] = {
    repo.getAllPendingUsers()
  }

  def assignRole(id: Long, role: String): Future[Int] = {
    repo.updateRole(id, role).flatMap { res =>
      if (res > 0) {
        repo.findById(id).map {
          case Some(user) =>
            val payload = Json.obj(
              "email" -> play.api.libs.json.JsString(user.email),
              "message" -> play.api.libs.json.JsString(s"Your sign-in request has been approved and you have been assigned as the [${role}]. Please login with your credentials to begin working")
            ).toString()
            kafkaService.sendEmailNotification(payload)
            res
          case None => res
        }
      } else {
        Future.successful(res)
      }
    }
  }
}
