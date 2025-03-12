## Get community shapefile from INSEE code

library(mitan)
library(dplyr)
library(sf)

comms <- read.csv("./site/comm_list.csv", header = TRUE)

communes_ndvi_dir <- "./data/communes_ndvi"
communes_shp_dir <- "./site/communes_results"
download_data <- TRUE
force_update <- FALSE

for(i in c(5, 6, 10, 14)) { #nrow(comms)
  message(paste0("Processing: ", comms[i, 2]))
  comm_id <- comms[i, 1]
  dptt <- substr(comm_id, 1, 2)
  bdforet_path <- file.path("./data/dptt_bdforetv2", dptt, "FORMATION_VEGETALE.shp")
  
  sentinel_data_dir <- file.path(communes_ndvi_dir, comm_id)
  
  fname_shp_commune <- file.path(communes_shp_dir, paste0(comm_id, "_commune.geojson"))
  
  ## First time for a community, if doesn't exist
  if(!file.exists(fname_shp_commune) | force_update) {
    all_comm_path <- "./data/france_commune-frmetdrom/COMMUNE_FRMETDROM.shp"
    comm <- sf::read_sf(all_comm_path, quiet = TRUE)
    id <- comm$INSEE_COM == comm_id
    sf::write_sf(
      comm[id, ],
      append = FALSE,
      dsn = fname_shp_commune
    )
  }

  ### BD Forets
  comm <- sf::read_sf(fname_shp_commune, quiet = TRUE)
  comm <- comm[!duplicated(comm), ]
  fname_bd_commune <- file.path(communes_shp_dir, paste0(comm$INSEE_COM, "_bdforet.geojson"))
            
  if(!file.exists(fname_bd_commune) | force_update) {
    bd <- extract_comm_from_bdforet(
      bd_path = bdforet_path,
      comm_geom = comm$geometry
    )
    bd <- bd[!bd$TFV_G11 %in% c("Lande", "Formation herbacée"), ]
    
    bd$Type <- case_when(
      grepl(pattern = "feuillus|peupleraie", bd$TFV_G11, ignore.case = TRUE) ~ "Feuillus",
      grepl(pattern = "conifères", bd$TFV_G11, ignore.case = TRUE) ~ "Conifères",
      .default = "Autres / Mixtes"
    )
    bd <- bd[sf::st_is_valid(bd), ]
    bd$area <- sf::st_area(bd)
    sf::st_write(
      bd,
      dsn = fname_bd_commune,
      dataset_options = c("ENCODING=ISO-8859-1"),
      delete_dsn = TRUE,
      quiet = TRUE
    )
  }
  
  ## IF no sentinel data
  ## Fix parallelisation, iterate until we have everything
  
  if(download_data) {
    message("Downloading Sentinel Data...")
    download_comm_ndvi(
        comm_geom = comm$geometry,
        min_date = "2016-01-01",
        max_date = "2026-01-01",
        output_dir = sentinel_data_dir,
        client_id,
        client_secret
    )
  }

  message("Aggregating Data...")
  
  bd <- sf::st_read(
    dsn = fname_bd_commune,
    quiet = TRUE
  )
  
  ndvi.y <- aggregate_ndvi(
    data_dir = sentinel_data_dir,
    bd_foret_shp = bd,
    filename = file.path(
      communes_ndvi_dir,
      paste0(comm$INSEE_COM, "_ndvi_agg.tif")
    )
  )
  
  message("Computing NDVI Difference...")
  ndvi_diff <- mitan::get_ndvi_diff(
    ndvi.y,
    n_years_lag = 1,
    max_difference_days = 15,
    min_past_ndvi = 0.7
  )
  
  terra::writeRaster(
    ndvi_diff,
    file.path(
      communes_ndvi_dir,
      paste0(comm$INSEE_COM, "_ndvi_diff.tif")
    ),
    overwrite = TRUE,
    datatype = "FLT4S",
    gdal = c("COMPRESS=DEFLATE", "PREDICTOR=2", "ZLEVEL=9")
  )
  
  message("Identifying clear-cuts...")
  cr_mask <- get_cr_mask(
    ndvi_diff,
    -0.45,
    min_pixels = 10
  )
  
  terra::writeRaster(
    cr_mask,
    file.path(
      communes_ndvi_dir,
      paste0(comm$INSEE_COM, "_cr_mask.tif")
    ),
    overwrite = TRUE,
    datatype = "FLT4S",
    gdal = c("COMPRESS=DEFLATE", "PREDICTOR=2", "ZLEVEL=9")
  )

  dptt <- substr(comm_id, 1, 2)

  cr_mask <- terra::rast(file.path(
    communes_ndvi_dir,
    paste0(comm_id, "_cr_mask.tif")
  ))
  
  pls <- mitan::postprocess_cr(
    cr_mask[[-1]],
    min_area = 1e3
  )
  
  cr_mask_pr <- sf::st_as_sf(pls)
  bd_shp <- sf::st_read(dsn = file.path(communes_shp_dir, paste0(comm$INSEE_COM, "_bdforet.geojson")))
  
  cr_mask_pr <- sf::st_transform(cr_mask_pr, sf::st_crs(bd_shp))
  cr_mask_pr <- sf::st_join(
    cr_mask_pr,
    bd_shp[, c("Type", "ESSENCE")],
    join = sf::st_intersects,
    largest = TRUE
  )
  cr_mask_pr <- cr_mask_pr %>% select(-dr)
  
  fp <- file.path(
    communes_shp_dir,
    paste0(comm_id, "_cr_mask_pr.geojson")
  )
  if(file.exists(fp)) unlink(fp)
  sf::st_write(
    cr_mask_pr,
    fp,
    append = FALSE
  )
  
  raster_stack <- terra::rast(file.path(
    communes_ndvi_dir,
    paste0(comm_id, "_ndvi_agg.tif")
  ))
  cr_mask_pr <- sf::st_transform(cr_mask_pr, terra::crs(raster_stack))
  extracted_data <- exactextractr::exact_extract(raster_stack, cr_mask_pr, fun = "median")
  extracted_data_with_ids <- bind_cols(cr_mask_pr$patches, extracted_data)
  
  fp <- file.path(
    communes_shp_dir,
    paste0(comm_id, "_ts.csv")
  )
  write.csv(extracted_data_with_ids, fp, row.names = FALSE)
  
  ndvi_diff <- terra::rast(file.path(
    communes_ndvi_dir,
    paste0(comm$INSEE_COM, "_ndvi_diff.tif")
  ))
  
  cr_mask_pr <- sf::st_read(file.path(
    communes_shp_dir,
    paste0(comm$INSEE_COM, "_cr_mask_pr.geojson")
  ), quiet = TRUE)
  
  map <- get_leaflet_map(
    cr_mask = cr_mask_pr,
    bd,
    comm_geom = comm$geometry
  )#;map
  
  out <- get_summary_stats(cr_mask_pr, comm_code = comm_id, ndvi_diff = ndvi_diff)
  
  update_or_append_csv(out, file_path = "./site/communes_results/comm_summary_stats.csv")
  
  df_per_year <- cr_mask_pr %>% 
    as_tibble() %>%
    select(-geometry) %>%
    group_by(year, Type) %>% 
    summarise(surface = sum(area_m2) / 1e4) %>%
    mutate(comm_code = comm_id) %>% mutate(year = as.numeric(year))
  
  update_or_append_csv(df_per_year, file_path = "./site/communes_results/comm_summary_stats_year.csv")
  
  saveRDS(map, file = file.path(communes_shp_dir, paste0(comm_id, "_map.rds")))
  
}
