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
    return(data$surface)
  } else {
    stop(paste("Request failed with status code", httr::status_code(response)))
  }
}