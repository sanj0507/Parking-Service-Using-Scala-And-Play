package service

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject._
import repository.VisitRepository
import play.api.libs.json._

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class AnalyticsService @Inject()(
    repo: VisitRepository
)(implicit ec: ExecutionContext) {

  def getDashboardMetrics(): Future[JsObject] = {
    for {
      visits <- repo.getAll()
      addOns <- repo.getAllAddOns()
    } yield {
      val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
      val todayPrefix = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))

      // 1. Average Retrieval Time (in minutes)
      val retrievalTimes = visits.flatMap { v =>
        (v.requestedAt, v.readyAt) match {
          case (Some(reqStr), Some(readyStr)) =>
            try {
              val reqTime = LocalDateTime.parse(reqStr, formatter)
              val readyTime = LocalDateTime.parse(readyStr, formatter)
              val mins = ChronoUnit.MINUTES.between(reqTime, readyTime)
              if (mins >= 0 && mins < 600) Some(mins) else None // filter outliers
            } catch {
              case _: Exception => None
            }
          case _ => None
        }
      }
      val avgRetrievalTime = if (retrievalTimes.nonEmpty) retrievalTimes.sum.toDouble / retrievalTimes.size else 0.0

      // 2. Peak Hours
      val hoursCount = visits.flatMap { v =>
        try {
          Some(LocalDateTime.parse(v.createdAt, formatter).getHour)
        } catch {
          case _: Exception => None
        }
      }.groupBy(identity).mapValues(_.size).toSeq.sortBy(_._1)

      val peakHoursJson = JsArray(hoursCount.map { case (hour, count) =>
        Json.obj("hour" -> hour, "count" -> count)
      })

      // 3. Total Daily Revenue
      val dailyRevenue = visits.filter { v =>
        v.checkoutAt.exists(_.startsWith(todayPrefix))
      }.flatMap(_.totalFee).sum

      // 4. Popular Add-Ons
      val addOnCounts = addOns.groupBy(_.serviceName).mapValues(_.size).toSeq.sortBy(-_._2)
      val popularAddOnsJson = JsArray(addOnCounts.map { case (name, count) =>
        Json.obj("name" -> name, "count" -> count)
      })

      Json.obj(
        "averageRetrievalTimeMinutes" -> avgRetrievalTime,
        "peakHours" -> peakHoursJson,
        "dailyRevenue" -> dailyRevenue,
        "popularAddOns" -> popularAddOnsJson,
        "totalVisits" -> visits.size
      )
    }
  }
}
