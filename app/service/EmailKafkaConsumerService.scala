package service

import org.apache.kafka.clients.consumer.{ConsumerConfig, KafkaConsumer}
import org.apache.kafka.common.serialization.StringDeserializer
import play.api.Configuration
import play.api.inject.ApplicationLifecycle
import play.api.libs.json.Json
import play.api.libs.mailer.{Email, MailerClient}

import java.time.Duration
import java.util.{Collections, Properties}
import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}

@Singleton
class KafkaConsumerService @Inject()(
    config: Configuration,
    lifecycle: ApplicationLifecycle,
  mailerClient: MailerClient
)(implicit ec: ExecutionContext) {

  private val bootstrapServers = config.getOptional[String]("kafka.bootstrap.servers").getOrElse("localhost:9092")
  private val topic = config.getOptional[String]("kafka.topic").getOrElse("email-notifications")

  private val props = new Properties()
  props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
  props.put(ConsumerConfig.GROUP_ID_CONFIG, "email-sender-group")
  props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, classOf[StringDeserializer].getName)
  props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, classOf[StringDeserializer].getName)
  props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")

  private val consumer = new KafkaConsumer[String, String](props)
  consumer.subscribe(Collections.singletonList(topic))

  @volatile private var running = true

  // Start polling in a background thread
  Future {
    while (running) {
      val records = consumer.poll(Duration.ofMillis(1000))
      records.forEach { record =>
        try {
          val json = Json.parse(record.value())
          val emailOpt = (json \ "email").asOpt[String]
          val messageOpt = (json \ "message").asOpt[String]

          (emailOpt, messageOpt) match {
            case (Some(email), Some(message)) if email.nonEmpty =>
              sendEmail(email, message)
            case _ =>
              println(s"Skipping email delivery: invalid payload or empty email in ${record.value()}")
          }
        } catch {
          case e: Exception =>
            println(s"Error processing Kafka message: ${e.getMessage}")
        }
      }
    }
  }

  private def sendEmail(to: String, message: String): Unit = {
    val email = Email(
      subject = "ParkOps Notification",
      from = "noreply@parkops.com",
      to = Seq(to),
      bodyText = Some(message)
    )
    mailerClient.send(email)
    println(s"Successfully sent email to $to via Mailpit")
  }

  lifecycle.addStopHook { () =>
    running = false
    Future.successful(consumer.close())
  }
}
