package models

object VisitStatus {

  val CheckedIn = "CheckedIn"

  val Requested = "Requested"

  val RequestedCheckout = "RequestedCheckout"

  val InProgress = "InProgress"

  val Ready = "Ready"

  val CheckedOut = "CheckedOut"

  val allStatuses = Seq(
    CheckedIn,
    Requested,
    RequestedCheckout,
    InProgress,
    Ready,
    CheckedOut
  )
}