## Get community shapefile from INSEE code

source("./utils.R")

comm_id <- 19136
dptt <- "19"

data_dir <- "data"
communes_ndvi_dir <- "communes_ndvi"
communes_shp_dir <- "communes_shp"
sentinel_data_dir <- file.path(data_dir, communes_ndvi_dir, comm_id)

bdforet_path <- file.path(data_dir, "dptt_bdforetv2", dptt, "FORMATION_VEGETALE.shp")

download_data <- T

### First time for a community, if doesn't exist
if(download_data) {
  all_comm_path <- "./data/france_commune-frmetdrom/COMMUNE_FRMETDROM.shp"
  comm <- sf::read_sf(all_comm_path)
  id <- comm$INSEE_COM == comm_id
  sf::write_sf(
    comm[id, ],
    dsn = paste0("./data/communes_shp/", comm[id, ]$INSEE_COM, ".shp"))
}

path <- file.path(data_dir, communes_shp_dir, paste0(comm_id, ".shp"))
comm <- sf::read_sf(path)
geom <- comm$geometry


### IF no sentinel data
if(download_data) {
  download_comm_ndvi(
      comm_geom = geom,
      min_date = "2016-01-01",
      max_date = "2025-01-01",
      output_dir = sentinel_data_dir,
      client_id,
      client_secret
  )
}

if(download_data) {
  bd <- extract_comm_from_bdforet(
    bd_path = bdforet_path,
    comm_geom = geom
  )
  bd <- bd[!bd$TFV_G11 %in% c("Lande", "Formation herbacée"), ]
  
  bd$Type <- case_when(
    grepl(pattern = "feuillus|peupleraie", bd$TFV_G11, ignore.case = TRUE) ~ "Feuillus",
    grepl(pattern = "conifères", bd$TFV_G11, ignore.case = TRUE) ~ "Conifères",
    .default = "Autres / Mixtes"
  )
  bd$area <- st_area(bd)
  sf::st_write(
    bd,
    dsn = file.path(data_dir, communes_shp_dir, paste0(comm$INSEE_COM, "_bdforetv2.shp")),
    dataset_options = "ENCODING=ISO-8859-1"
  )
}

ndvi.y <- aggregate_ndvi(
  data_dir = sentinel_data_dir,
  bd_foret_shp = bd,
  filename = file.path(
    data_dir,
    communes_ndvi_dir,
    paste0(comm$INSEE_COM, "_ndvi_agg.tif")
  )
)

ndvi_diff <- get_ndvi_diff(
  ndvi.y,
  n_years_lag = 1,
  max_difference_days = 15,
  min_past_ndvi = 0.7
)

terra::writeRaster(
  ndvi_diff, 
  file.path(
    data_dir,
    communes_ndvi_dir,
    paste0(comm$INSEE_COM, "_ndvi_diff.tif")
  ),
  overwrite = TRUE,
  datatype = "FLT4S",
  gdal = c("COMPRESS=DEFLATE", "PREDICTOR=2", "ZLEVEL=9")
)
