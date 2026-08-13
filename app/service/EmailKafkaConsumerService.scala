package service

import org.apache.kafka.clients.consumer.{ConsumerConfig, KafkaConsumer}
import org.apache.kafka.common.serialization.StringDeserializer
import play.api.Configuration
import play.api.inject.ApplicationLifecycle
import play.api.libs.json.Json
import play.api.libs.mailer.{Email, MailerClient, AttachmentData}
import play.api.Logger

import com.itextpdf.text.{BaseColor, Document, Element, FontFactory, Paragraph, Phrase}
import com.itextpdf.text.pdf.{PdfPCell, PdfPTable, PdfWriter}
import java.io.ByteArrayOutputStream

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
  private val fromAddress = config.getOptional[String]("play.mailer.user").getOrElse("noreply@parkops.com")

  private val logger = Logger(this.getClass)

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
          val customerNameOpt = (json \ "customerName").asOpt[String]
          val emailOpt = (json \ "email").asOpt[String]
          val messageOpt = (json \ "message").asOpt[String]
          val bookingIdOpt = (json \ "bookingId").asOpt[String]
          val spotOpt = (json \ "spot").asOpt[String]
          val priceOpt = (json \ "price").asOpt[String]
          val emailType = (json \ "emailType").asOpt[String].getOrElse("UPDATE")

          (emailOpt, messageOpt) match {
            case (Some(email), Some(message)) if email.nonEmpty =>
              val customerName = customerNameOpt.getOrElse("Valued Customer")
              sendEmail(customerName, email, message, bookingIdOpt.getOrElse(""), spotOpt.getOrElse(""), priceOpt.getOrElse(""), emailType)
            case _ =>
              logger.warn(s"Skipping email delivery: invalid payload or empty email in ${record.value()}")
          }
        } catch {
          case e: Exception =>
            logger.error(s"Error processing Kafka message: ${e.getMessage}")
        }
      }
    }
  }

  private def generatePdfReceipt(bookingId: String, spot: String, price: String, message: String): Array[Byte] = {
    val baos = new ByteArrayOutputStream()
    val document = new Document()
    PdfWriter.getInstance(document, baos)
    document.open()
    
    val titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, BaseColor.DARK_GRAY)
    val headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BaseColor.WHITE)
    val bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 12, BaseColor.BLACK)
    
    val title = new Paragraph("ParkOps Official Receipt", titleFont)
    title.setAlignment(Element.ALIGN_CENTER)
    title.setSpacingAfter(20f)
    document.add(title)
    
    val msgPara = new Paragraph(s"Message: $message", bodyFont)
    msgPara.setSpacingAfter(20f)
    document.add(msgPara)
    
    if (bookingId.nonEmpty) {
      val table = new PdfPTable(2)
      table.setWidthPercentage(100)
      table.setSpacingBefore(10f)
      table.setSpacingAfter(20f)

      def addHeader(text: String): Unit = {
        val cell = new PdfPCell(new Phrase(text, headerFont))
        cell.setBackgroundColor(new BaseColor(52, 58, 64)) // Dark grey
        cell.setPadding(8f)
        table.addCell(cell)
      }

      def addCell(text: String): Unit = {
        val cell = new PdfPCell(new Phrase(text, bodyFont))
        cell.setPadding(8f)
        table.addCell(cell)
      }

      addHeader("Description")
      addHeader("Details")

      addCell("Booking ID")
      addCell(bookingId)

      if (spot != null && spot.nonEmpty) {
        addCell("Parking Spot")
        addCell(spot)
      }

      if (price != null && price.nonEmpty) {
        addCell("Total Price")
        addCell(price)
      }

      document.add(table)
    }
    
    val footer = new Paragraph("Thank you for using ParkOps!", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, BaseColor.GRAY))
    footer.setAlignment(Element.ALIGN_CENTER)
    document.add(footer)
    
    document.close()
    baos.toByteArray
  }

  private def sendEmail(customerName: String, to: String, message: String, bookingId: String, spot: String, price: String, emailType: String): Unit = {
    val isReceipt = emailType == "CHECKOUT"
    val htmlContent = views.html.emailTemplate(customerName, bookingId, spot, price, message, isReceipt).body

    val attachments = if (isReceipt) {
      val pdfBytes = generatePdfReceipt(bookingId, spot, price, message)
      Seq(AttachmentData("receipt.pdf", pdfBytes, "application/pdf"))
    } else {
      Seq.empty[AttachmentData]
    }

    val threadId = s"<booking-${boo kingId}@parkops.local>"
    val headers = if (bookingId.nonEmpty) {
      if (emailType == "CHECKIN") {
        Seq("Message-ID" -> threadId, "References" -> threadId)
      } else {
        Seq("In-Reply-To" -> threadId, "References" -> threadId)
      }
    } else {
      Seq.empty[(String, String)]
    }

    val finalSubject = s"ParkOps Notification - Booking $bookingId"

    val email = Email(
      subject = finalSubject,
      from = fromAddress,
      to = Seq(to),
      bodyText = Some(message),
      bodyHtml = Some(htmlContent),
      attachments = attachments,
      headers = headers
    )
    mailerClient.send(email)
    logger.info(s"Successfully sent email to $to")
  }

  lifecycle.addStopHook { () =>
    running = false
    Future.successful(consumer.close())
  }
}
