package models

import play.api.libs.json._

object VehicleType extends Enumeration {
  type VehicleType = Value
  val Compact, Sedan, SUV, EV = Value

  implicit val format: Format[VehicleType] = new Format[VehicleType] {
    def reads(json: JsValue): JsResult[VehicleType] = json.validate[String].map(VehicleType.withName)
    def writes(obj: VehicleType): JsValue = JsString(obj.toString)
  }
}
