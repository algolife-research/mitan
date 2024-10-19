### Catalog request example

library(httr)
library(jsonlite)

catalog_request <- function(bbox, datetime, limit = 100, auth_token) {
  
  url <- "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search"
  
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'application/json'
  )
  
  body_data <- list(
    bbox = bbox,
    datetime = datetime,
    collections = list("sentinel-2-l2a"),
    limit = 100#,
    # distinct = "date"
  )
  
  # Convert the body data to JSON
  body_json <- toJSON(body_data, auto_unbox = TRUE)
  
  # Make the POST request
  response <- POST(
    url = url,
    add_headers(headers),
    body = body_json,
    encode = "json"
  )
  
  # Print the response
  r <- content(response, as = "text") %>%
    # jsonlite::toJSON() %>%
    jsonlite::fromJSON()
  jsonlite::prettify()
  r
  
}

