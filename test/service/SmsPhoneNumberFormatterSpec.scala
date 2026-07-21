package service

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

class SmsPhoneNumberFormatterSpec extends AnyWordSpec with Matchers {
  "SmsPhoneNumberFormatter" should {
    "normalize local 10-digit phone numbers to E.164" in {
      SmsPhoneNumberFormatter.normalize("9876543210", "+91") shouldBe Some("+919876543210")
    }

    "normalize phone numbers with spaces and separators" in {
      SmsPhoneNumberFormatter.normalize("98765-43210", "+91") shouldBe Some("+919876543210")
      SmsPhoneNumberFormatter.normalize("98765 43210", "+91") shouldBe Some("+919876543210")
    }

    "normalize country-code-prefixed numbers without a plus sign" in {
      SmsPhoneNumberFormatter.normalize("919876543210", "+91") shouldBe Some("+919876543210")
    }

    "keep already normalized numbers unchanged" in {
      SmsPhoneNumberFormatter.normalize("+16402015011", "+91") shouldBe Some("+16402015011")
    }

    "reject invalid phone numbers" in {
      SmsPhoneNumberFormatter.normalize("98765", "+91") shouldBe None
    }
  }
}
