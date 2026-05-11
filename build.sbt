name := "parking-service"

organization := "com.example"

version := "1.0-SNAPSHOT"

scalaVersion := "2.13.18"

lazy val root = (project in file("."))
  .enablePlugins(PlayScala)

libraryDependencies ++= Seq(
  guice,

  "com.typesafe.play" %% "play-slick" % "5.3.0",
  "com.typesafe.play" %% "play-slick-evolutions" % "5.3.0",

  "com.mysql" % "mysql-connector-j" % "8.3.0",

  "org.scalatestplus.play" %% "scalatestplus-play" % "7.0.2" % Test
)

ThisBuild / libraryDependencySchemes +=
  "org.scala-lang.modules" %% "scala-xml" % VersionScheme.Always