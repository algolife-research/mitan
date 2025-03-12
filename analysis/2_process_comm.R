library(mitan)

comms <- read.csv("./site/comm_list.csv", header = TRUE)
# comms <- read.csv("./data/communes_pnr_millevaches.csv", header = TRUE)
# comm_ids <- c("87183", "87153", "87122", "87064", "63263", "19261", "19136")

for(i in seq_len(nrow(comms))) {
  print(i)
  comm_id <- comms[i, "Code"]
  dptt <- substr(comm_id, 1, 2)

  communes_ndvi_dir <- "./data/communes_ndvi"##"communes_ndvi"
  communes_shp_dir <- "./site/communes_results"#"communes_shp"
  sentinel_data_dir <- file.path(data_dir, communes_ndvi_dir, comm_id)
  
  path <- file.path(communes_shp_dir, paste0(comm_id, "_commune.geojson"))
  comm <- sf::read_sf(path)
  comm <- comm[!duplicated(comm), ]
  geom <- comm$geometry
  
  bd_shp <- sf::read_sf(
    file.path(communes_shp_dir, paste0(comm$INSEE_COM, "_bdforet.geojson"))
  )

  ndvi_diff <- terra::rast(file.path(
    communes_ndvi_dir,
    paste0(comm$INSEE_COM, "_ndvi_diff.tif")
  ))
  
  cr_mask_pr <- sf::st_read(file.path(
    communes_shp_dir,
    paste0(comm$INSEE_COM, "_cr_mask_pr.geojson")
  ))

  map <- get_leaflet_map(
    cr_mask = cr_mask_pr,
    bd_shp,
    comm_geom = comm$geometry
  );map
  
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
