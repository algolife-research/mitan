#' Retrieve Sentinel Hub Authentication Token
#'
#' This function retrieves an authentication token for accessing Sentinel Hub API.
#' 
#' @param client_id Character. Sentinel Hub client ID.
#' @param client_secret Character. Sentinel Hub client secret.
#' @return Character. Access token required for API calls.
#' @examples
#' \dontrun{
#' token <- get_token("your_client_id", "your_client_secret")
#' }
#' @export
get_token <- function(client_id, client_secret) {
  url <- "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token"
  body_data <- list(
    grant_type = "client_credentials",
    client_id = client_id,
    client_secret = client_secret
  )
  
  tk_response <- httr::POST(
    url = url,
    httr::add_headers(`content-type` = "application/x-www-form-urlencoded"),
    body = body_data,
    encode = "form"
  )
  
  if (httr::status_code(tk_response) != 200) {
    stop("Failed to retrieve token. Check client ID and secret.")
  }
  
  return(httr::content(tk_response)$access_token)
}


#' Download NDVI Data for a Commune
#'
#' This function downloads NDVI data for a given commune geometry using Sentinel Hub's API.
#'
#' @param comm_geom sf object. Geometry of the commune.
#' @param min_date Character. Start date for data (format "YYYY-MM-DD").
#' @param max_date Character. End date for data (format "YYYY-MM-DD").
#' @param output_dir Character. Directory to save NDVI data.
#' @param client_id Character. Sentinel Hub client ID.
#' @param client_secret Character. Sentinel Hub client secret.
#' @return NULL. Saves NDVI data to `output_dir`.
#' @examples
#' \dontrun{
#' download_comm_ndvi(
#'   comm_geom = some_geom,
#'   min_date = "2022-01-01",
#'   max_date = "2022-01-31",
#'   output_dir = "data/ndvi",
#'   client_id = "your_client_id",
#'   client_secret = "your_client_secret"
#' )
#' }
#' @export
download_comm_ndvi <- function(
    comm_geom,
    min_date,
    max_date,
    output_dir,
    client_id,
    client_secret
) {
  message("Getting auth token...")
  tk <- get_token(client_id, client_secret)
  
  message("Getting dates...")
  dates <- request_sentinel_dates(
    min_date = min_date,
    max_date = max_date,
    comm_geom = comm_geom,
    auth_token = tk
  )
  
  message("Downloading NDVI data...")
  bbox <- sf::st_bbox(comm_geom)
  bbox2 <- transform_bbox(bbox)
  
  for (date in dates) {
    message("Processing date: ", date)
    response <- ndvi_request(
      bbox = as.vector(bbox),
      width = bbox2$width / 10,
      height = bbox2$height / 10,
      from = date,
      to = paste0(as.Date(date) + 1, "T00:00:00Z"),
      name = gsub("-|:", "", date),
      auth_token = tk
    )
    
    write_extract_tar_response(
      response,
      file.path(output_dir)
    )
  }
  
  return(invisible(NULL))
}

#' Retrieve Available Sentinel Image Dates
#'
#' This function retrieves a list of available Sentinel-2 image dates for a specified date range and area of interest. 
#' The dates are filtered based on maximum allowable cloud cover.
#'
#' @param min_date Character. The start date of the range, in "YYYY-MM-DD" format.
#' @param max_date Character. The end date of the range, in "YYYY-MM-DD" format.
#' @param comm_geom sf object. An sf geometry object representing the area of interest in WGS84 CRS.
#' @param auth_token Character. A valid authentication token for the Sentinel Hub API.
#' @param max_cloud_cover Numeric. Maximum allowable cloud cover percentage for image filtering. Default is 25.
#' @return Character vector. Dates of available images in "YYYY-MM-DDTHH:MM:SSZ" format.
#' @examples
#' \dontrun{
#' dates <- request_sentinel_dates(
#'   min_date = "2023-01-01",
#'   max_date = "2023-01-31",
#'   comm_geom = some_geom,
#'   auth_token = "your_token",
#'   max_cloud_cover = 25
#' )
#' }
#' @export
request_sentinel_dates <- function(min_date, max_date, comm_geom, auth_token, max_cloud_cover = 25) {
  # Bounding box and transformation
  bbox <- sf::st_bbox(comm_geom)
  bbox2 <- transform_bbox(bbox)
  
  # Helper function to split date range by year
  get_date_iterations <- function(min_date, max_date) {
    min_date <- as.Date(min_date)
    max_date <- as.Date(max_date)
    years <- seq(as.numeric(format(min_date, "%Y")), as.numeric(format(max_date, "%Y")))
    
    lapply(years, function(year) {
      start <- ifelse(year == min_date, min_date, as.Date(paste0(year, "-01-01")))
      end <- ifelse(year == max_date, max_date, as.Date(paste0(year, "-12-31")))
      c(start, end)
    })
  }
  
  # Get year-wise date ranges to optimize API calls
  date_ranges <- get_date_iterations(min_date, max_date)
  
  message("Requesting catalog dates from Sentinel Hub...")
  date_list <- list()
  
  for (range in date_ranges) {
    datetime <- paste0(range[1], "T00:00:00Z/", range[2], "T23:59:59Z")
    message("Fetching data for date range: ", datetime)
    
    # Make a catalog request for each year
    cat_list <- catalog_request(
      bbox = as.vector(bbox),
      datetime = datetime,
      max_cloud_cover = max_cloud_cover,
      distinct = "date",
      limit = 100,
      auth_token = auth_token
    )
    
    # Append results if available, handle missing results
    if (length(cat_list$features) > 0) {
      date_list <- c(date_list, sapply(cat_list$features, function(x) x$date))
    } else {
      warning("No data available for date range: ", datetime)
    }
  }
  
  # Return unique, non-NA dates
  unique(unlist(date_list, use.names = FALSE))
}

#' Sentinel Hub Catalog Request
#'
#' Sends a request to the Sentinel Hub catalog API to retrieve metadata about available images, filtered by bounding box, date range, and cloud cover.
#'
#' @param bbox Numeric vector. Bounding box for the area of interest, specified as \code{c(xmin, ymin, xmax, ymax)}.
#' @param datetime Character. Datetime range in ISO 8601 format, e.g., "YYYY-MM-DDTHH:MM:SSZ/YYYY-MM-DDTHH:MM:SSZ".
#' @param max_cloud_cover Numeric. Maximum allowable cloud cover percentage for filtering. Default is 25.
#' @param distinct Character. Optional field for distinct filtering in the API request. Default is NULL.
#' @param limit Integer. Maximum number of features to retrieve. Default is 100.
#' @param auth_token Character. Sentinel Hub API authentication token.
#' @return List. Contains metadata for available images within the specified parameters.
#' @examples
#' \dontrun{
#' catalog_data <- catalog_request(
#'   bbox = c(2.0, 48.0, 3.0, 49.0),
#'   datetime = "2023-01-01T00:00:00Z/2023-01-31T23:59:59Z",
#'   max_cloud_cover = 25,
#'   auth_token = "your_token"
#' )
#' }
#' @export
catalog_request <- function(bbox, datetime, max_cloud_cover = 25, distinct = NULL, limit = 100, auth_token) {
  # API URL
  url <- "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search"
  
  # Headers for authorization
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'application/json'
  )
  
  # Request payload
  body_data <- list(
    bbox = bbox,
    datetime = datetime,
    collections = list("sentinel-2-l2a"),
    limit = limit,
    distinct = distinct,
    filter = paste0("eo:cloud_cover < ", max_cloud_cover)
  )
  
  body_json <- jsonlite::toJSON(body_data, auto_unbox = TRUE)
  
  # Send POST request
  response <- httr::POST(
    url = url,
    httr::add_headers(.headers = headers),
    body = body_json,
    encode = "json"
  )
  
  # Parse response
  if (httr::status_code(response) == 200) {
    jsonlite::fromJSON(httr::content(response, as = "text"))
  } else {
    stop("Catalog request failed with status code: ", httr::status_code(response))
  }
}



#' Request TIFF Image from Sentinel Hub
#'
#' This function sends a request to the Sentinel Hub API to retrieve a TIFF image for the specified 
#' bounding box, date range, and image dimensions.
#'
#' @param bbox Numeric vector. Bounding box coordinates as \code{c(xmin, ymin, xmax, ymax)}.
#' @param width Integer. Width of the requested image in pixels.
#' @param height Integer. Height of the requested image in pixels.
#' @param from Character. Start date in "YYYY-MM-DDTHH:MM:SSZ" format.
#' @param to Character. End date in "YYYY-MM-DDTHH:MM:SSZ" format.
#' @param name Character. Identifier for the requested image.
#' @param auth_token Character. Authentication token for the Sentinel Hub API.
#' @return response object. The API response containing the TIFF image data.
#' @examples
#' \dontrun{
#' response <- tiff_request(
#'   bbox = c(2.0, 48.0, 3.0, 49.0),
#'   width = 512,
#'   height = 512,
#'   from = "2022-01-01T00:00:00Z",
#'   to = "2022-01-31T00:00:00Z",
#'   name = "example_image",
#'   auth_token = "your_token"
#' )
#' }
#' @export
tiff_request <- function(bbox, width, height, from, to, name, auth_token) {
  url <- "https://services.sentinel-hub.com/api/v1/process"
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'multipart/form-data',
    'Accept' = 'application/tar'
  )
  
  body_data <- list(
    input = list(
      bounds = list(
        properties = list(crs = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"),
        bbox = bbox
      ),
      data = list(
        list(
          type = "sentinel-2-l2a",
          dataFilter = list(timeRange = list(from = from, to = to))
        )
      )
    ),
    output = list(
      width = width,
      height = height,
      responses = list(list(
        identifier = name,
        format = list(type = "image/tiff")
      ))
    )
  )
  
  response <- httr::POST(
    url = url,
    httr::add_headers(.headers = headers),
    body = list(request = jsonlite::toJSON(body_data, auto_unbox = TRUE)),
    encode = "json"
  )
  
  response
}



#' Write and Extract TAR File from API Response
#'
#' This function writes a TAR file from the raw content of an API response and extracts 
#' the contents to the specified output directory.
#'
#' @param response response object. API response containing the TAR file data.
#' @param output_dir Character. Directory path to save and extract the contents of the TAR file. Default is current directory.
#' @return Character vector. Names of the extracted files.
#' @examples
#' \dontrun{
#' file_names <- write_extract_tar_response(response, "output_directory")
#' }
#' @export
write_extract_tar_response <- function(response, output_dir = ".") {
  tar_path <- tempfile()
  on.exit(unlink(tar_path))
  
  writeBin(httr::content(response, "raw"), con = tar_path)
  extracted_files <- utils::untar(tar_path, exdir = output_dir)
  
  extracted_files
}

