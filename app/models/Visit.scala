package models;

case class Visit(
    id: Long = 0,
    vehicleNumber: String,
    customerName: String,
    status: String
)