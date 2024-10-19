#####
## Dependencies
library(sf)
library(raster)
library(httr)
library(jsonlite)
library(dplyr)
library(terra)
library(rts)
library(landscapemetrics)
source("eau/canopee_utils.R")

#####
## SETTINGS

datetime <- "2010-01-01T00:00:00Z/2017-06-01T00:00:00Z"
download_sentinel_data <- FALSE
sentinel_data_dir <- "./data_ndvi_samis2/"

# Latitude and Longitude of the point of interest (captage Samis)
central_lat <- 45.805217 
central_lon <- 1.708340

#####
## PREPROCESSING

bounding_box <- get_bounding_box(
  lat = central_lat,
  lon = central_lon,
  radius_km = 1
)

square_extent <- ext(
  bounding_box$west,
  bounding_box$east,
  bounding_box$south,
  bounding_box$north
)

bbox <- st_bbox(square_extent) %>% as.vector()
bbox2 <- transform_bbox(bbox[1], bbox[3], bbox[2], bbox[4])

#####
## Download sentinel data
if(download_sentinel_data) {
  tk <- get_token(client_id, client_secret)
  source("./utils.R")
  cat_list <- catalog_request(
    as.vector(bbox),
    datetime,
    max_cloud_cover = 1,
    distinct = "date",
    limit = 100,
    auth_token = tk
  )
  
  dates <- paste0(cat_list$features, "T00:00:00Z")
  
  for(date in dates) {
    message((date))
    response <- ndvi_request(
      bbox = bbox,
      width = 300,
      height = 300,
      from = date,
      to = paste0(as.Date(date) + 1, "T00:00:00Z"),
      name = gsub("-|:", "", date),
      auth_token = tk
    )
    
    write_extract_tar_response(
      response,
      file.path(sentinel_data_dir)
    )
  }
}


#####
## Data analysis

n_years_lag <- 1
max_difference_days <- 15
min_past_ndvi <- 0.8

lst <- list.files(
  path = sentinel_data_dir,
  pattern = '.tif$',
  full.names = TRUE
)

r <- terra::rast(lst)
rn <- terra::app(r, function(x) x / 1e4)

d <- as.Date(
  gsub("T000000Z.tif", "", basename(lst)),
  format = "%Y%m%d"
)

ndvi <- rts(rn, d)

ep <- endpoints(ndvi, on = "months", k = 1)
ndvi.y <- period.apply(ndvi, ep, function(x) return(mean(x, na.rm = TRUE)))

dates <- index(ndvi.y)

ndvi_diff <- ndvi.y[[1]]
ndvi_diff <- init(ndvi_diff, NA) # Initialize with NA values
ndvi_diff <- rep(ndvi_diff, nlyr(ndvi.y@raster)) # Repeat for all layers

for (i in seq_along(dates)) {
  # Find the index of the date from one year earlier
  date_prev <- dates[i] - (n_years_lag * 365 * 24 * 3600)
  index_prev <- which.min(abs(dates - date_prev)) # Find closest date
  
  # If the closest date is within a reasonable threshold (e.g., ±15 days), calculate the difference
  if (abs(dates[index_prev] - date_prev) <= max_difference_days) {
    # Calculate the difference between current layer and the matched previous year's layer
    clamped <- terra::clamp(ndvi.y[[index_prev]], lower = min_past_ndvi, upper = Inf, values=FALSE)
    ndvi_diff[[i]] <- ndvi.y[[i]] - clamped
  }
}




main_color <- "firebrick"
na_color <- "#00000000"
THRESHOLD <- -0.45
cr_mask <- terra::app(ndvi_diff, function(x) ifelse(x < THRESHOLD, 1, NA))
na_layers <- sapply(1:nlyr(cr_mask), function(i) {
  all(is.na(values(cr_mask[[i]])))
})

# Keep only layers that do not contain only NA values
cr_mask_clean <- cr_mask[[!na_layers]]
cr_mask_clean_merged <- mean(cr_mask_clean, na.rm = TRUE)

## Remove small patches
clusters <- patches(cr_mask_clean_merged, directions = 8)
cluster_sizes <- freq(clusters)
large_clusters <- cluster_sizes$value[cluster_sizes$count >= 20]
mask_large_clusters <- clusters %in% large_clusters
cr_mask_clean_merged_filtered <- mask(cr_mask_clean_merged, mask_large_clusters, maskvalue = 0, updatevalue = NA)


pal <- colorNumeric("Reds", domain = c(0, 1), na.color = na_color)

map <- leaflet() %>%
  addProviderTiles(
    providers$Esri.WorldImagery,
    options = providerTileOptions(opacity = 0.8)
  ) %>%
  addMarkers(
    icon = list(
      iconUrl = "https://img.icons8.com/?size=100&id=HZwRzPt0jC68&format=png&color=000000",
      iconWidth = 15
    ),
    lng = central_lon, 
    lat = central_lat
  ) %>%
  addRectangles(
    lng1 = square_extent[1], lat1 = square_extent[3],
    lng2 = square_extent[2], lat2 = square_extent[4],
    color = "forestgreen",
    weight = 3,
    opacity = 1,
    fillOpacity = 0.
  ) %>%
  addScaleBar(position = "bottomright") %>%
  addRasterImage(
    cr_mask_clean_merged_filtered, opacity = 0.6, colors = pal
  ) %>%
  addCircleMarkers(
    lng = cent$x, lat = cent$y,
    radius = 2,
    color = "black",
    stroke = FALSE,
    fillOpacity = 0.5
  )

map



# Example on a known clear cut (2021 in Sainte Genevieve)
id <- cellFromXY(ndvi, matrix(c(1.717, 45.812), nrow = 1))
par(mfrow=c(2, 2))
plot(ndvi[[1]]); points(1.717, 45.812, cex=1, col=main_color, pch =16)
plot(ndvi[id])
plot(ndvi.y[id])
plot(ndvi_diff[id][!is.na(ndvi_diff[id])], type = "s")
abline(h = THRESHOLD, col = main_color)



cent <- get_centroids(cr_mask_clean_merged_filtered, directions = 8)

coords_coupes <- data.frame(X = cent$x, Y = cent$y)

df_well <- convert_coordinates(data.frame(X = central_lon, Y = central_lat))
df_coupes_rases <- cbind(df, convert_coordinates(coords_coupes))

target_point <- c(x = df_well$X[1], y = df_well$Y[1])
df_coupes_rases$distance_to_target <- sqrt((df_coupes_rases$X - target_point["x"])^2 +
                                    (df_coupes_rases$Y - target_point["y"])^2)

cr_mask_clean_merged_filtered_conv <- project(cr_mask_clean_merged_filtered, "EPSG:32631")
df_coupes_rases$surface_ha <- lsm_p_area(cr_mask_clean_merged_filtered_conv)$value

well_elevation <- get_elevation_open(central_lat, central_lon)

res_elev <- apply(cent, 1, function(xx){
  Sys.sleep(0.1)
  elev <- get_elevation_open(xx[["y"]], xx[["x"]]) 
  if(is.na(elev)) elev <- get_elevation_open(xx[["y"]], xx[["x"]]) 
  if(is.na(elev)) elev <- get_elevation_open(xx[["y"]], xx[["x"]]) 
  elev
})

df_coupes_rases <- df_coupes_rases |>
  mutate(altitude = res_elev) |>
  mutate(delta_altitude = altitude - well_elevation) |>
  mutate(pente = 100 * delta_altitude / distance_to_target)

View(df_coupes_rases)

df_captage <- tibble(
  X,
  Y,
  altitude = well_elevation,
  distance_min_CR,
  distance_moy_CR,
  surface_CR_totale,
  surface_CR_1km,
  surface_CR_500m,
  surface_CR_amont,
  pente_moyenne_CR_amont
)

# Quels critères ? Idéalement deux groupes: "coupe rase" et "controle"
# Cela implique une définition stricte de la coupe rase: quelle distance ?  quelle altitude relative? quelle durée entre l'analyse et la coupe? (année passée? dans les 5 ans?)
# Qualitatif / quantiftatif (au moins une coupe rase selone les critères OU estimation de la surface)


##### 
## REPORT


