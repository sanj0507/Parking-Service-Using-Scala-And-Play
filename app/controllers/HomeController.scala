package controllers

import javax.inject._
import play.api.mvc._

@Singleton
class HomeController @Inject()(val controllerComponents: ControllerComponents)
    extends BaseController {

  def index() = Action {
    Ok(views.html.index())
  }

  def user() = Action {
    Ok(views.html.user())
  }

  def valet() = Action {
    Ok(views.html.valet())
  }

  def admin() = Action {
    Ok(views.html.admin())
  }
}
