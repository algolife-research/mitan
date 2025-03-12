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
  
  # Define the body data
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
  
  tk <- httr::content(tk_response)$access_token
  return(tk)
  
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
  
  if(is.null(tk)) stop("Authentication issue.")
  
  message("Getting dates...")
  dates <- request_sentinel_dates(
    min_date = min_date,
    max_date = max_date,
    comm_geom = comm_geom,
    auth_token = tk
  )
  
  message("Getting NDVI...")
  
  bbox <- sf::st_bbox(comm_geom)
  bbox2 <- transform_bbox(bbox)
  
  library(foreach)
  library(doParallel)
  
  # Detect number of available cores
  num_cores <- detectCores() - 1  # Leave one core free
  
  # Register parallel backend
  cl <- makeCluster(num_cores)
  registerDoParallel(cl)
  
  message(length(dates))
  
  existing_dates <- list.files(file.path(output_dir))
  # dates
  # dates <- setdiff(paste0(gsub("-|:", "", dates), ".tif"), existing_dates)
  formatted_dates <- paste0(gsub("[-:]", "", dates), ".tif")
  idx <- which(!(formatted_dates %in% existing_dates))
  
  dates <- dates[idx]
  if(length(dates) == 0) {
    message("No new dates to be downloaded.")
  } else {
    message(dates)

  foreach(date = dates, .packages = c("mitan", "jsonlite", "httr")) %dopar% {
  # for(date in dates) {
    print(paste("Processing:", date))
    
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
    
    Sys.sleep(runif(1, 5, 20))
    
  }
  }
  stopCluster(cl)
  
  return(NULL)
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
  bbox <- st_bbox(comm_geom)
  bbox2 <- transform_bbox(bbox)
  
  get_date_iterations <- function(min_date, max_date) {
    min_date <- as.Date(min_date)
    max_date <- as.Date(max_date)
    start_year <- as.numeric(format(min_date, "%Y"))
    end_year <- as.numeric(format(max_date, "%Y"))
    
    output <- list()
    for (year in start_year:end_year) {
      if (year == start_year) {
        current_min_date <- min_date
      } else {
        current_min_date <- as.Date(paste0(year, "-01-01"))
      }
      
      # Determine the max date for the current year
      if (year == end_year) {
        current_max_date <- max_date
      } else {
        current_max_date <- as.Date(paste0(year, "-12-31"))
      }
      output[[1L + year - start_year]] <- c(current_min_date, current_max_date)
    }
    return(output)
  }
  date_ranges <- get_date_iterations(min_date, max_date)
  
  message("Catalog requests...")
  date_list <- list()
  for(i in seq_along(date_ranges)) {
    datetime <- paste0(
      date_ranges[[i]][1], 
      "T00:00:00Z/",
      date_ranges[[i]][2],
      "T00:00:00Z"
    )
    message(datetime)
    cat_list <- catalog_request(
      as.vector(bbox),
      datetime,
      max_cloud_cover = max_cloud_cover,
      distinct = "date",
      limit = 100,
      auth_token = auth_token
    )
    if(length(cat_list$features) == 0) {
      date_list[[i]] <- NA
    } else {
      date_list[[i]] <- paste0(cat_list$features, "T00:00:00Z")
    }
  }
  date_list <- unlist(date_list)
  date_list <- date_list[!is.na(date_list)]
  return(date_list)
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
  
  url <- "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search"
  
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'application/json'
  )
  
  body_data <- list(
    bbox = bbox,
    datetime = datetime,
    collections = list("sentinel-2-l2a"),
    limit = limit,
    distinct = distinct,
    filter = paste0("eo:cloud_cover < ", max_cloud_cover)
  )
  
  body_json <- jsonlite::toJSON(body_data, auto_unbox = TRUE)
  
  response <- httr::POST(
    url = url,
    httr::add_headers(headers),
    body = body_json,
    encode = "json"
  )
  
  r <- httr::content(response, as = "text") %>%
    jsonlite::fromJSON()
  
  return(r)
  
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
tiff_request <- function(
    bbox,
    width,
    height,
    from ="2022-10-01T00:00:00Z",
    to = "2022-10-31T00:00:00Z",
    name = "default",
    auth_token
) {
  
  url <- "https://services.sentinel-hub.com/api/v1/process"
  
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'multipart/form-data',
    'Accept' = 'application/tar'
  )
  
  body_data <- list(
    input = list(
      bounds = list(
        properties = list(
          crs = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          # crs = "http://www.opengis.net/def/crs/EPSG/0/32736"
        ),
        bbox = bbox
      ),
      data = list(
        list(
          type = "sentinel-2-l2a",
          dataFilter = list(
            timeRange = list(
              from = from,
              to = to
            )
          )
        )
      )
    ),
    output = list(
      width = width,
      height = height,
      responses = list(list(
        identifier = name,
        format = list(
          type = "image/tiff"
        ))
      )
    )
  )
  
  body_json <- jsonlite::toJSON(body_data, auto_unbox = TRUE)
  
  evalscript <- '//VERSION=3

  function setup() {
    return {
      input: [{
        bands: ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B8A", "B11", "B12"],
        units: "DN"
      }],
      output: {
        id: "default",
        bands: 12,
        sampleType: SampleType.UINT16
      }
    }
  }
  
  function evaluatePixel(sample) {
      return [ sample.B01, sample.B02, sample.B03, sample.B04, sample.B05, sample.B06, sample.B07, sample.B08, sample.B8A, sample.B09, sample.B11, sample.B12]
  }'
  
  response <- httr::POST(
    url = url,
    httr::add_headers(headers),
    body = list(
      request = body_json,
      evalscript = evalscript
    )
  )
  
  return(response)
  
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
  
  utils::untar(tar_path, exdir = output_dir)
  
  fnames <- utils::untar(tar_path, list = TRUE)
  
  return(fnames)
}


#' Request NDVI Data from Sentinel Hub API
#'
#' This function sends a request to the Sentinel Hub API to retrieve NDVI data within a specified 
#' bounding box, resolution, and date range. The NDVI is computed from Sentinel-2 bands and returned 
#' as a TIFF image.
#'
#' @param bbox Numeric vector. Bounding box coordinates as \code{c(xmin, ymin, xmax, ymax)} in WGS84 CRS.
#' @param width Integer. Width of the output image in pixels.
#' @param height Integer. Height of the output image in pixels.
#' @param from Character. Start date-time in ISO 8601 format (e.g., "YYYY-MM-DDTHH:MM:SSZ").
#' @param to Character. End date-time in ISO 8601 format (e.g., "YYYY-MM-DDTHH:MM:SSZ").
#' @param name Character. Identifier for the response image layer.
#' @param auth_token Character. Sentinel Hub API authentication token.
#' @return response object. The response object from the API call containing NDVI data as a TIFF image.
#' @examples
#' \dontrun{
#' response <- ndvi_request(
#'   bbox = c(2.0, 48.0, 3.0, 49.0),
#'   width = 512,
#'   height = 512,
#'   from = "2023-01-01T00:00:00Z",
#'   to = "2023-01-31T00:00:00Z",
#'   name = "ndvi_image",
#'   auth_token = "your_api_token"
#' )
#' }
#' @export
ndvi_request <- function(
    bbox,
    width,
    height,
    from ="2022-10-01T00:00:00Z",
    to = "2022-10-31T00:00:00Z",
    name = "default",
    auth_token
) {
  
  url <- "https://services.sentinel-hub.com/api/v1/process"
  
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'multipart/form-data',
    'Accept' = 'application/tar'
  )
  
  body_data <- list(
    input = list(
      bounds = list(
        properties = list(
          crs = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          # crs = "http://www.opengis.net/def/crs/EPSG/0/32736"
        ),
        bbox = bbox
      ),
      data = list(
        list(
          type = "sentinel-2-l2a",
          dataFilter = list(
            timeRange = list(
              from = from,
              to = to
            )
          )
        )
      )
    ),
    output = list(
      width = width,
      height = height,
      responses = list(list(
        identifier = name,
        format = list(
          type = "image/tiff"
        ))
      )
    )
  )
  
  body_json <- jsonlite::toJSON(body_data, auto_unbox = TRUE)
  
  evalscript <- paste0('//VERSION=3
  function setup() {
    return {
      input: [{
        bands:["B04", "B08", "SCL"]
      }],
      output: {
        id: "', name, '",
        bands: 1,
        sampleType: SampleType.UINT8
      }
    }
  }
  function evaluatePixel(sample) {
    if ([2, 3, 6, 8, 9, 10].includes(sample.SCL) ){
      return [ 0 ]
    } else{
      let ndvi = 1 + (sample.B08 - sample.B04) / (sample.B08 + sample.B04)
      return [ ndvi * 255 / 2 ]
    }

  }')
  
  response <- httr::POST(
    url = url,
    httr::add_headers(headers),
    body = list(
      request = body_json,
      evalscript = evalscript
    )
  )
  return(response)
  
}

