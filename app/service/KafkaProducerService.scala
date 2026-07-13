package service

import org.apache.kafka.clients.producer.{KafkaProducer, ProducerConfig, ProducerRecord}
import org.apache.kafka.common.serialization.StringSerializer
import play.api.Configuration
import play.api.inject.ApplicationLifecycle
import play.api.libs.json.Json

import java.util.Properties
import javax.inject.{Inject, Singleton}
import scala.concurrent.Future

@Singleton
class KafkaProducerService @Inject()(config: Configuration, lifecycle: ApplicationLifecycle) {

  private val bootstrapServers = config.getOptional[String]("kafka.bootstrap.servers").getOrElse("localhost:9092")
  private val topic = config.getOptional[String]("kafka.topic").getOrElse("email-notifications")
  private val smsTopic = config.getOptional[String]("kafka.smsTopic").getOrElse("sms-notifications")

  private val props = new Properties()
  props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
  props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, classOf[StringSerializer].getName)
  props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, classOf[StringSerializer].getName)

  private val producer = new KafkaProducer[String, String](props)

  lifecycle.addStopHook { () =>
    Future.successful(producer.close())
  }

  def sendEmailNotification(message: String): Unit = {
    val record = new ProducerRecord[String, String](topic, message)
    producer.send(record)
  }

  def sendSmsNotification(phone: String, message: String): Unit = {
    val jsonPayload = Json.obj(
      "phone" -> phone,
      "message" -> message
    ).toString()
    val record = new ProducerRecord[String, String](smsTopic, phone, jsonPayload)
    producer.send(record)
  }
}
