package controllers

import javax.inject._
import play.api.mvc._
import org.apache.pekko.stream.scaladsl.{Flow, Sink}
import service.WebSocketManager

@Singleton
class WebSocketController @Inject() (
    val controllerComponents: ControllerComponents,
    wsManager: WebSocketManager
) extends BaseController {

  def ws(): WebSocket = WebSocket.accept[String, String] { request =>
    // We ignore incoming messages from the client because this is a 
    // strictly one-way broadcast of events (server -> client)
    val in = Sink.ignore

    // We send out whatever the WebSocketManager broadcasts
    val out = wsManager.source

    Flow.fromSinkAndSource(in, out)
  }
}
