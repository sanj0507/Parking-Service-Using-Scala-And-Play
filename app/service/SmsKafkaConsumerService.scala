package service

import org.apache.pekko.actor.ActorSystem
import com.twilio.Twilio
import com.twilio.rest.api.v2010.account.Message
import com.twilio.`type`.PhoneNumber
import org.apache.kafka.clients.consumer.{ConsumerConfig, KafkaConsumer}
import org.apache.kafka.common.serialization.StringDeserializer
import play.api.Configuration
import play.api.inject.ApplicationLifecycle
import play.api.libs.json.Json

import java.time.Duration
import java.util.{Collections, Properties}
import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}

@Singleton
class SmsKafkaConsumerService @Inject()(
    config: Configuration,
    actorSystem: ActorSystem,
    lifecycle: ApplicationLifecycle
)(implicit ec: ExecutionContext) {

  // Twilio Setup
  private val twilioSid = config.getOptional[String]("twilio.accountSid").getOrElse("default_sid")
  private val twilioToken = config.getOptional[String]("twilio.authToken").getOrElse("default_token")
  private val fromPhone = new PhoneNumber(config.getOptional[String]("twilio.phoneNumber").getOrElse("+1234567890"))
  
  if (twilioSid != "default_sid") {
    Twilio.init(twilioSid, twilioToken)
  }

  // Kafka Setup
  private val bootstrapServers = config.getOptional[String]("kafka.bootstrap.servers").getOrElse("localhost:9092")
  private val topic = config.getOptional[String]("kafka.smsTopic").getOrElse("sms-notifications")

  private val props = new Properties()
  props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
  props.put(ConsumerConfig.GROUP_ID_CONFIG, "sms-consumer-group")
  props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, classOf[StringDeserializer].getName)
  props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, classOf[StringDeserializer].getName)
  props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")

  private val consumer = new KafkaConsumer[String, String](props)
  consumer.subscribe(Collections.singletonList(topic))

  @volatile private var running = true

  // Start polling in the background using ExecutionContext
  Future {
    while (running) {
      val records = consumer.poll(Duration.ofMillis(1000))
      records.forEach { record =>
        try {
          val json = Json.parse(record.value())
          val phoneOpt = (json \ "phone").asOpt[String]
          val messageOpt = (json \ "message").asOpt[String]

          (phoneOpt, messageOpt) match {
            case (Some(phone), Some(message)) if phone.nonEmpty =>
              sendSms(phone, message)
            case _ =>
              println(s"Skipping SMS delivery: invalid payload or empty phone in ${record.value()}")
          }
        } catch {
          case e: Exception =>
            println(s"Error processing SMS Kafka message: ${e.getMessage}")
        }
      }
    }
  }

  private def sendSms(to: String, message: String): Unit = {
    if (twilioSid == "default_sid") {
      println(s"Mocking SMS to $to: $message")
      return
    }

    try {
      val msg = Message.creator(
        new PhoneNumber(to),
        fromPhone,
        message
      ).create()
      println(s"Successfully sent SMS to $to with SID: ${msg.getSid}")
    } catch {
      case e: Exception =>
        println(s"Failed to send SMS to $to: ${e.getMessage}")
    }
  }

  lifecycle.addStopHook { () =>
    running = false
    Future.successful(consumer.close())
  }
}
