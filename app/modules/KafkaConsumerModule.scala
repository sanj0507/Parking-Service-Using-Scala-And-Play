package modules

import play.api.inject.{Binding, Module}
import play.api.{Configuration, Environment}
import service.{KafkaConsumerService, SmsKafkaConsumerService}

class KafkaConsumerModule extends Module {
  override def bindings(environment: Environment, configuration: Configuration): Seq[Binding[_]] = {
    Seq(
      bind[KafkaConsumerService].toSelf.eagerly(),
      bind[SmsKafkaConsumerService].toSelf.eagerly()
    )
  }
}
