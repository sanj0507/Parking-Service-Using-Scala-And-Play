// @GENERATOR:play-routes-compiler
// @SOURCE:conf/routes

import play.api.mvc.Call


import _root_.controllers.Assets.Asset

// @LINE:9
package controllers {

  // @LINE:9
  class ReverseAssets(_prefix: => String) {
    def _defaultPrefix: String = {
      if (_prefix.endsWith("/")) "" else "/"
    }

  
    // @LINE:9
    def versioned(file:Asset): Call = {
      implicit lazy val _rrc = new play.core.routing.ReverseRouteContext(Map(("path", "/public"))); _rrc
      Call("GET", _prefix + { _defaultPrefix } + "assets/" + implicitly[play.api.mvc.PathBindable[Asset]].unbind("file", file))
    }
  
  }

  // @LINE:14
  class ReverseVisitController(_prefix: => String) {
    def _defaultPrefix: String = {
      if (_prefix.endsWith("/")) "" else "/"
    }

  
    // @LINE:14
    def checkIn: Call = {
      
      Call("POST", _prefix + { _defaultPrefix } + "check-in")
    }
  
    // @LINE:16
    def getAllVisits: Call = {
      
      Call("GET", _prefix + { _defaultPrefix } + "visits")
    }
  
    // @LINE:18
    def getVisitById(id:Long): Call = {
      
      Call("GET", _prefix + { _defaultPrefix } + "visits/" + play.core.routing.dynamicString(implicitly[play.api.mvc.PathBindable[Long]].unbind("id", id)))
    }
  
    // @LINE:20
    def requestVehicle(id:Long): Call = {
      
      Call("POST", _prefix + { _defaultPrefix } + "visits/" + play.core.routing.dynamicString(implicitly[play.api.mvc.PathBindable[Long]].unbind("id", id)) + "/request-vehicle")
    }
  
  }


}
