// @GENERATOR:play-routes-compiler
// @SOURCE:conf/routes

package router

import play.core.routing._
import play.core.routing.HandlerInvokerFactory._

import play.api.mvc._

import _root_.controllers.Assets.Asset

class Routes(
  override val errorHandler: play.api.http.HttpErrorHandler, 
  // @LINE:9
  Assets_0: controllers.Assets,
  // @LINE:14
  VisitController_1: controllers.VisitController,
  val prefix: String
) extends GeneratedRouter {

  @javax.inject.Inject()
  def this(errorHandler: play.api.http.HttpErrorHandler,
    // @LINE:9
    Assets_0: controllers.Assets,
    // @LINE:14
    VisitController_1: controllers.VisitController
  ) = this(errorHandler, Assets_0, VisitController_1, "/")

  def withPrefix(addPrefix: String): Routes = {
    val prefix = play.api.routing.Router.concatPrefix(addPrefix, this.prefix)
    router.RoutesPrefix.setPrefix(prefix)
    new Routes(errorHandler, Assets_0, VisitController_1, prefix)
  }

  private val defaultPrefix: String = {
    if (this.prefix.endsWith("/")) "" else "/"
  }

  def documentation = List(
    ("""GET""", this.prefix + (if(this.prefix.endsWith("/")) "" else "/") + """assets/""" + "$" + """file<.+>""", """controllers.Assets.versioned(path:String = "/public", file:Asset)"""),
    ("""POST""", this.prefix + (if(this.prefix.endsWith("/")) "" else "/") + """check-in""", """controllers.VisitController.checkIn"""),
    ("""GET""", this.prefix + (if(this.prefix.endsWith("/")) "" else "/") + """visits""", """controllers.VisitController.getAllVisits"""),
    ("""GET""", this.prefix + (if(this.prefix.endsWith("/")) "" else "/") + """visits/""" + "$" + """id<[^/]+>""", """controllers.VisitController.getVisitById(id:Long)"""),
    ("""POST""", this.prefix + (if(this.prefix.endsWith("/")) "" else "/") + """visits/""" + "$" + """id<[^/]+>/request-vehicle""", """controllers.VisitController.requestVehicle(id:Long)"""),
    Nil
  ).foldLeft(Seq.empty[(String, String, String)]) { (s,e) => e.asInstanceOf[Any] match {
    case r @ (_,_,_) => s :+ r.asInstanceOf[(String, String, String)]
    case l => s ++ l.asInstanceOf[List[(String, String, String)]]
  }}


  // @LINE:9
  private lazy val controllers_Assets_versioned0_route = Route("GET",
    PathPattern(List(StaticPart(this.prefix), StaticPart(this.defaultPrefix), StaticPart("assets/"), DynamicPart("file", """.+""", encodeable=false)))
  )
  private lazy val controllers_Assets_versioned0_invoker = createInvoker(
    Assets_0.versioned(fakeValue[String], fakeValue[Asset]),
    play.api.routing.HandlerDef(this.getClass.getClassLoader,
      "router",
      "controllers.Assets",
      "versioned",
      Seq(classOf[String], classOf[Asset]),
      "GET",
      this.prefix + """assets/""" + "$" + """file<.+>""",
      """ Map static resources from the /public folder to the /assets URL path""",
      Seq()
    )
  )

  // @LINE:14
  private lazy val controllers_VisitController_checkIn1_route = Route("POST",
    PathPattern(List(StaticPart(this.prefix), StaticPart(this.defaultPrefix), StaticPart("check-in")))
  )
  private lazy val controllers_VisitController_checkIn1_invoker = createInvoker(
    VisitController_1.checkIn,
    play.api.routing.HandlerDef(this.getClass.getClassLoader,
      "router",
      "controllers.VisitController",
      "checkIn",
      Nil,
      "POST",
      this.prefix + """check-in""",
      """""",
      Seq()
    )
  )

  // @LINE:16
  private lazy val controllers_VisitController_getAllVisits2_route = Route("GET",
    PathPattern(List(StaticPart(this.prefix), StaticPart(this.defaultPrefix), StaticPart("visits")))
  )
  private lazy val controllers_VisitController_getAllVisits2_invoker = createInvoker(
    VisitController_1.getAllVisits,
    play.api.routing.HandlerDef(this.getClass.getClassLoader,
      "router",
      "controllers.VisitController",
      "getAllVisits",
      Nil,
      "GET",
      this.prefix + """visits""",
      """""",
      Seq()
    )
  )

  // @LINE:18
  private lazy val controllers_VisitController_getVisitById3_route = Route("GET",
    PathPattern(List(StaticPart(this.prefix), StaticPart(this.defaultPrefix), StaticPart("visits/"), DynamicPart("id", """[^/]+""", encodeable=true)))
  )
  private lazy val controllers_VisitController_getVisitById3_invoker = createInvoker(
    VisitController_1.getVisitById(fakeValue[Long]),
    play.api.routing.HandlerDef(this.getClass.getClassLoader,
      "router",
      "controllers.VisitController",
      "getVisitById",
      Seq(classOf[Long]),
      "GET",
      this.prefix + """visits/""" + "$" + """id<[^/]+>""",
      """""",
      Seq()
    )
  )

  // @LINE:20
  private lazy val controllers_VisitController_requestVehicle4_route = Route("POST",
    PathPattern(List(StaticPart(this.prefix), StaticPart(this.defaultPrefix), StaticPart("visits/"), DynamicPart("id", """[^/]+""", encodeable=true), StaticPart("/request-vehicle")))
  )
  private lazy val controllers_VisitController_requestVehicle4_invoker = createInvoker(
    VisitController_1.requestVehicle(fakeValue[Long]),
    play.api.routing.HandlerDef(this.getClass.getClassLoader,
      "router",
      "controllers.VisitController",
      "requestVehicle",
      Seq(classOf[Long]),
      "POST",
      this.prefix + """visits/""" + "$" + """id<[^/]+>/request-vehicle""",
      """""",
      Seq()
    )
  )


  def routes: PartialFunction[RequestHeader, Handler] = {
  
    // @LINE:9
    case controllers_Assets_versioned0_route(params@_) =>
      call(Param[String]("path", Right("/public")), params.fromPath[Asset]("file", None)) { (path, file) =>
        controllers_Assets_versioned0_invoker.call(Assets_0.versioned(path, file))
      }
  
    // @LINE:14
    case controllers_VisitController_checkIn1_route(params@_) =>
      call { 
        controllers_VisitController_checkIn1_invoker.call(VisitController_1.checkIn)
      }
  
    // @LINE:16
    case controllers_VisitController_getAllVisits2_route(params@_) =>
      call { 
        controllers_VisitController_getAllVisits2_invoker.call(VisitController_1.getAllVisits)
      }
  
    // @LINE:18
    case controllers_VisitController_getVisitById3_route(params@_) =>
      call(params.fromPath[Long]("id", None)) { (id) =>
        controllers_VisitController_getVisitById3_invoker.call(VisitController_1.getVisitById(id))
      }
  
    // @LINE:20
    case controllers_VisitController_requestVehicle4_route(params@_) =>
      call(params.fromPath[Long]("id", None)) { (id) =>
        controllers_VisitController_requestVehicle4_invoker.call(VisitController_1.requestVehicle(id))
      }
  }
}
