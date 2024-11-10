#' Retrieve Surface Area for a French Commune
#'
#' Queries the French government's geo API to get the surface area of a commune.
#'
#' @param insee_code Character. INSEE code for the commune.
#' @return Numeric. Surface area in square meters.
#' @examples
#' \dontrun{
#' surface_area <- get_surface_commune("75056")  # Paris
#' }
#' @export
get_surface_commune <- function(insee_code) {
  url <- paste0("https://geo.api.gouv.fr/communes/", insee_code, "?fields=surface&format=json")
  response <- httr::GET(url, accept("application/json"))
  if (httr::status_code(response) == 200) {
    data <- httr::content(response, "parsed")
    return(data$surface)  # Return the parsed data
  } else {
    stop(paste("Request failed with status code", status_code(response)))
  }
}


#' Get bounding box around a point
#'
#' @param lat 
#' @param lon 
#' @param radius_km 
#' @export
get_bounding_box <- function(lat, lon, radius_km = 1) {
  lat_offset <- radius_km / 111 # Approx 111 km per degree of latitude
  lon_offset <- radius_km / (111 * cos(lat * pi / 180))
  
  north <- lat + lat_offset
  south <- lat - lat_offset
  east <- lon + lon_offset
  west <- lon - lon_offset
  
  list(north = north, south = south, east = east, west = west)
}

#' @export
convert_coordinates <- function(
    df,
    coord_names = c("X", "Y"),
    crs_from = 4326,
    crs_to = 32631
) {
  
  sf_points2 <- sf::st_as_sf(df, coords = coord_names, crs = crs_from)
  sf_points_utm2 <- sf::st_transform(sf_points2, crs = crs_to)
  
  df_out <- as.data.frame(st_coordinates(sf_points_utm2))
  
  return(df_out)
}



#' @export
get_elevation_open <- function(lat, lon) {
  
  # prep_req <- paste0(lat, ",", lon, collapse = "|")
  prep_req <- paste0(
    "?lon=",
    paste0(lon[1], collapse = "|"),
    "&lat=",
    paste0(lat[1], collapse = "|"),
    "&resource=ign_rge_alti_wld&delimiter=|&indent=false&measures=false&zonly=true"
  )
  base_url <- "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json"
  url <- paste0(base_url, prep_req)
  
  test <- "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=1.48|1.49&lat=43.54|43.55&resource=ign_rge_alti_wld&delimiter=|&indent=false&measures=false&zonly=false"
  
  response <- httr::GET(url)
  if (status_code(response) == 200) {
    elevation_data <- jsonlite::fromJSON(content(response, "text"), flatten = TRUE)
    if (length(elevation_data$elevations) > 0) {
      elevation <- elevation_data$elevations
    } else {
      elevation <- NA
    }
  } else {
    # Gestion des erreurs
    warning("Erreur lors de la récupération des données d'élévation")
    elevation <- NA
  }
  
  return(elevation)
}