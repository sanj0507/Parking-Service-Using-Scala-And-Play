name := "parking-service"

organization := "com.example"

version := "1.0-SNAPSHOT"

scalaVersion := "2.13.18"

lazy val root = (project in file("."))
  .enablePlugins(PlayScala)

libraryDependencies ++= Seq(
  guice,
  evolutions,
  "com.typesafe.play" %% "play-slick" % "5.3.0",
  "com.typesafe.play" %% "play-slick-evolutions" % "5.3.0",
  "com.mysql" % "mysql-connector-j" % "8.3.0",
  "com.github.jwt-scala" %% "jwt-play-json" % "10.0.0",
  "org.mindrot" % "jbcrypt" % "0.4",
  "com.github.karelcemus" %% "play-redis" % "5.4.0",
  cacheApi,
  "org.apache.kafka" % "kafka-clients" % "3.7.0",
  "com.typesafe.play" %% "play-mailer" % "9.0.0",
  "com.typesafe.play" %% "play-mailer-guice" % "9.0.0",
  "org.scalatestplus.play" %% "scalatestplus-play" % "7.0.2" % Test
)

ThisBuild / libraryDependencySchemes +=
  "org.scala-lang.modules" %% "scala-xml" % VersionScheme.Always

