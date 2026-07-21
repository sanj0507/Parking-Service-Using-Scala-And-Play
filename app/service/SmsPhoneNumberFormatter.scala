package service

object SmsPhoneNumberFormatter {
  def normalize(phone: String, defaultCountryCode: String): Option[String] = {
    val trimmed = phone.trim
    val compact = trimmed.replaceAll("[\\s\\-().]", "")

    if (compact.isEmpty) {
      None
    } else if (compact.startsWith("+")) {
      val digitsOnly = compact.drop(1)
      if (digitsOnly.forall(_.isDigit) && digitsOnly.length >= 8 && digitsOnly.length <= 15) {
        Some(s"+$digitsOnly")
      } else {
        None
      }
    } else {
      val digitsOnly = compact.filter(_.isDigit)

      if (digitsOnly.isEmpty) {
        None
      } else if (digitsOnly.length == 10) {
        Some(s"$defaultCountryCode$digitsOnly")
      } else if (digitsOnly.length >= 11 && digitsOnly.length <= 15) {
        Some(s"+$digitsOnly")
      } else {
        None
      }
    }
  }
}
