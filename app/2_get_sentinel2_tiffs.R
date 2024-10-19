##### 
## Dependencies
library(sf)
library(raster)
library(httr)
library(jsonlite)
library(dplyr)

source("utils.R")

##### 
## Cadastre

sf_parcelles <- read_sf("./data/cadastre-87153-parcelles.json")
# sf_parcelles <- sf_parcelles %>% filter(section == "E" & numero == 509)
bbox <- extent(sf_parcelles) %>% as.vector()
bbox2 <- transform_bbox(bbox[1], bbox[2], bbox[3], bbox[4])
# bbox <- bbox[c(1,3,2,4)]
bbox <- st_bbox(bbox2$bbox) %>% as.vector()
# plot(sf_parcelles)

#####
### Grid metadata

bbox


##### 
## Sentinel data
client_id <- "30d37988-d12e-4cef-9d53-a73a763acfc7"
client_secret <- "zvbTXnUZRV2iPY31e2UBaGhQeVD3sitG"
tk <- get_token(client_id, client_secret)

datetime <- "2020-01-01T00:00:00Z/2025-01-01T00:00:00Z"

cat_list <- catalog_request(
  as.vector(bbox),
  datetime,
  max_cloud_cover = 10,
  distinct = "date",
  limit = 100,
  auth_token = tk
) 

dates <- paste0(cat_list$features, "T00:00:00Z")

for(date in dates) {
  message(date)
  date2 <- paste0(as.Date(date) + 1, "T00:00:00Z")
  tiff <- tiff_request(
    bbox = bbox,
    width = round(bbox2$width),
    height = round(bbox2$height),
    from = date,
    to = date2,
    name = "default",
    auth_token = tk
  )
  write_extract_tar_response(
    tiff,
    file.path("data", "tiffs", gsub("-|:", "", date))
  )
}


