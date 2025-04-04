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
  response <- httr::GET(url, httr::accept("application/json"))
  if (httr::status_code(response) == 200) {
    data <- httr::content(response, "parsed")
    return(data$surface)  # Return the parsed data
  } else {
    stop(paste("Request failed with status code", httr::status_code(response)))
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
  
  df_out <- as.data.frame(sf::st_coordinates(sf_points_utm2))
  
  return(df_out)
}



#' @export
get_elevation_open <- function(lat, lon, chunk_size = 50) {
  base_url <- "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json"
  
  results <- vector("list", length = ceiling(length(lat) / chunk_size))
  
  for (i in seq(1, length(lat), by = chunk_size)) {
    lat_chunk <- lat[i:min(i + chunk_size - 1, length(lat))]
    lon_chunk <- lon[i:min(i + chunk_size - 1, length(lon))]
    
    # Construct the request
    prep_req <- paste0(
      "?lon=",
      paste0(lon_chunk, collapse = "|"),
      "&lat=",
      paste0(lat_chunk, collapse = "|"),
      "&resource=ign_rge_alti_wld&delimiter=|&indent=false&measures=false&zonly=true"
    )
    
    url <- paste0(base_url, prep_req)
    
    response <- tryCatch({
      httr::GET(url)
    }, error = function(e) {
      warning("Request failed: ", conditionMessage(e))
      return(NULL)
    })
    
    if (!is.null(response) && httr::status_code(response) == 200) {
      elevation_data <- fromJSON(httr::content(response, "text"), flatten = TRUE)
      if (length(elevation_data$elevations) > 0) {
        results[[i]] <- elevation_data$elevations
      } else {
        results[[i]] <- rep(NA, length(lat_chunk))
      }
    } else {
      warning("Failed to retrieve data from API")
      results[[i]] <- rep(NA, length(lat_chunk))
    }
  }
  
  return(unlist(results))
}
