## Get community shapefile from INSEE code

source("./utils.R")

comm_id <- 63263
dptt <- "63"

data_dir <- "data"
communes_ndvi_dir <- "communes_ndvi"
communes_shp_dir <- "communes_shp"
sentinel_data_dir <- file.path(data_dir, communes_ndvi_dir, comm_id)

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
  bd_shp_cropped <- extract_comm_from_bdforet(
    bd_path = "./data/dptt_bdforetv2/63/FORMATION_VEGETALE.shp",
    comm_geom = geom
  )
  sf::st_write(
    bd_shp_cropped,
    dsn = file.path(data_dir, communes_shp_dir, paste0(comm$INSEE_COM, "_bdforetv2.shp")),
    dataset_options = "ENCODING=ISO-8859-1"
  )
}
