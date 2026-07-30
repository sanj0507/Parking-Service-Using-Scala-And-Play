package service

import javax.inject._
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{BroadcastHub, Keep, MergeHub, Sink, Source}
import scala.concurrent.ExecutionContext

@Singleton
class WebSocketManager @Inject() (implicit mat: Materializer, ec: ExecutionContext) {

  // Create a dynamic Sink and Source using MergeHub and BroadcastHub
  // MergeHub allows multiple producers to push into the stream
  // BroadcastHub allows multiple consumers to read from the stream
  private val (hubSink, hubSource) =
    MergeHub.source[String](perProducerBufferSize = 16)
      .toMat(BroadcastHub.sink(bufferSize = 256))(Keep.both)
      .run()

  // Ensure the stream is always active even if there are no subscribers
  hubSource.runWith(Sink.ignore)

  /**
   * Broadcast a message to all connected WebSocket clients
   */
  def broadcast(message: String): Unit = {
    Source.single(message).runWith(hubSink)
  }

  /**
   * Get the Source to connect a new WebSocket client
   */
  def source: Source[String, _] = hubSource
}
