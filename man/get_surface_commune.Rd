% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/geo_utils.R
\name{get_surface_commune}
\alias{get_surface_commune}
\title{Retrieve Surface Area for a French Commune}
\usage{
get_surface_commune(insee_code)
}
\arguments{
\item{insee_code}{Character. INSEE code for the commune.}
}
\value{
Numeric. Surface area in square meters.
}
\description{
Queries the French government's geo API to get the surface area of a commune.
}
\examples{
\dontrun{
surface_area <- get_surface_commune("75056")  # Paris
}
}
