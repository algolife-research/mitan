% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/sentinel_utils.R
\name{request_sentinel_dates}
\alias{request_sentinel_dates}
\title{Retrieve Available Sentinel Image Dates}
\usage{
request_sentinel_dates(
  min_date,
  max_date,
  comm_geom,
  auth_token,
  max_cloud_cover = 25
)
}
\arguments{
\item{min_date}{Character. The start date of the range, in "YYYY-MM-DD" format.}

\item{max_date}{Character. The end date of the range, in "YYYY-MM-DD" format.}

\item{comm_geom}{sf object. An sf geometry object representing the area of interest in WGS84 CRS.}

\item{auth_token}{Character. A valid authentication token for the Sentinel Hub API.}

\item{max_cloud_cover}{Numeric. Maximum allowable cloud cover percentage for image filtering. Default is 25.}
}
\value{
Character vector. Dates of available images in "YYYY-MM-DDTHH:MM:SSZ" format.
}
\description{
This function retrieves a list of available Sentinel-2 image dates for a specified date range and area of interest.
The dates are filtered based on maximum allowable cloud cover.
}
\examples{
\dontrun{
dates <- request_sentinel_dates(
  min_date = "2023-01-01",
  max_date = "2023-01-31",
  comm_geom = some_geom,
  auth_token = "your_token",
  max_cloud_cover = 25
)
}
}
