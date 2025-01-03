% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/geo_data_wrangling.R
\name{get_comm_shp}
\alias{get_comm_shp}
\title{Retrieve Commune Geometry by INSEE Code}
\usage{
get_comm_shp(
  insee_code = 87153,
  path = "./eau/commune-frmetdrom/COMMUNE_FRMETDROM.shp"
)
}
\arguments{
\item{insee_code}{Character. INSEE code for the commune.}

\item{path}{Character. Path to the shapefile containing commune geometries.}
}
\value{
sf object. Geometry of the specified commune.
}
\description{
This function retrieves the geometry of a specified commune by matching the INSEE code in the given shapefile.
}
\examples{
\dontrun{
commune_geom <- get_comm_shp(insee_code = "75056", path = "path/to/commune.shp")
}
}
