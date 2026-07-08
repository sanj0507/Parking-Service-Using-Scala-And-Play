package repository

import javax.inject._
import models.User
import play.api.db.slick.DatabaseConfigProvider
import slick.jdbc.MySQLProfile
import slick.jdbc.MySQLProfile.api._

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class UserRepository @Inject()(
    dbConfigProvider: DatabaseConfigProvider
)(implicit ec: ExecutionContext) {
  private val dbConfig = dbConfigProvider.get[MySQLProfile]
  private val db = dbConfig.db

  class UsersTable(tag: Tag) extends Table[User](tag, "users") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def username = column[String]("username", O.Length(255), O.Unique)
    def email = column[String]("email", O.Length(255), O.Unique)
    def passwordHash = column[String]("password_hash")
    def role = column[String]("role")

    def * = (id, username, email, passwordHash, role) <> ((User.apply _).tupled, User.unapply)
  }

  private val users = TableQuery[UsersTable]

  def createTable(): Future[Unit] =
    db.run(users.schema.createIfNotExists)

  def insert(user: User): Future[Long] =
    db.run((users returning users.map(_.id)) += user)

  def findByEmail(email: String): Future[Option[User]] =
    db.run(users.filter(_.email === email).result.headOption)

  def findByUsername(username: String): Future[Option[User]] =
    db.run(users.filter(_.username === username).result.headOption)

  def findById(id: Long): Future[Option[User]] =
    db.run(users.filter(_.id === id).result.headOption)
    
  def count(): Future[Int] =
    db.run(users.length.result)

  def getAllPendingUsers(): Future[Seq[User]] =
    db.run(users.filter(_.role === "Pending").result)

  def updateRole(id: Long, role: String): Future[Int] =
    db.run(users.filter(_.id === id).map(_.role).update(role))
}
