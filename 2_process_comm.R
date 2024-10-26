source("./utils.R")

comm_id <- 19136
# 19261
dptt <- "19"

data_dir <- "data"
communes_ndvi_dir <- "communes_ndvi"
communes_shp_dir <- "communes_shp"
sentinel_data_dir <- file.path(data_dir, communes_ndvi_dir, comm_id)

path <- file.path(data_dir, communes_shp_dir, paste0(comm_id, ".shp"))
comm <- sf::read_sf(path)
geom <- comm$geometry

bd_shp <- sf::read_sf(
  file.path(data_dir, communes_shp_dir, paste0(comm$INSEE_COM, "_bdforetv2.shp"))
)

#####
## Data analysis

ndvi_diff <- terra::rast(file.path(
  data_dir,
  communes_ndvi_dir,
  paste0(comm$INSEE_COM, "_ndvi_diff.tif")
))

cr_mask <- get_cr_mask(
  ndvi_diff,
  -0.45,
  min_pixels = 10
)

cr_mask_pr <- fillHoles(as.polygons(cr_mask))
cr_mask_pr <- st_cast(st_as_sf(cr_mask_pr), "POLYGON")
cr_mask_pr$area_cr <- st_area(cr_mask_pr)

cr_mask_pr <- st_join(
  cr_mask_pr,
  bd_shp[, c("Type", "ESSENCE")],
  join = st_intersects, largest = TRUE
)

map <- get_leaflet_map(
  cr_mask = cr_mask_pr,
  bd_shp,
  comm_geom = comm$geometry
);map


cr_mask_conv <- terra::project(cr_mask, "EPSG:32631")

# sf::st_centroid(cr_mask_pr)

df_coupes_rases <- get_centroids(cr_mask_conv, directions = 8) %>%
  select(x, y) %>%
  rename(longitude = x, latitude = y)

df_coupes_rases$surface_ha <- lsm_p_area(cr_mask_conv, directions = 8)$value

coords_4326 <- convert_coordinates(df_coupes_rases, c("longitude", "latitude"), crs_from = "EPSG:32631", crs_to = "EPSG:4326")
res_elev <- get_elevation_open(lat = coords_4326$Y, lon = coords_4326$X)

df_coupes_rases <- df_coupes_rases |>
  mutate(altitude = res_elev)

## surface de foret


df_coupes_sf <- st_as_sf(df_coupes_rases, coords = c("longitude", "latitude"), crs = 32631)
bd_shp2 <- st_transform(bd_shp, crs = 32631)

df_with_tfv <- st_join(df_coupes_sf, bd_shp2[, "Type"], join = st_nearest_feature)

df_per_type <- df_with_tfv %>% 
  as_tibble() %>% 
  group_by(Type) %>% 
  summarise(surface = sum(surface_ha))

df_captage <- tibble(
  duree_suivi_y = nlyr(cr_mask) - 2,
  surface_CR_totale = sum(df_coupes_rases$surface_ha),
  surface_foret_ha = as.vector(sum(bd_shp$area)) / 1e4,
  surface_foret_ha_feuillus = as.vector(sum(bd_shp[bd_shp$Type == "Feuillus", ]$area)) / 1e4,
  surface_foret_ha_coniferes = as.vector(sum(bd_shp[bd_shp$Type == "Conifères", ]$area)) / 1e4,
  surface_foret_ha_autres = as.vector(sum(bd_shp[bd_shp$Type == "Autres / Mixtes", ]$area)) / 1e4,
  surface_CR_feuillus = df_per_type$surface[df_per_type$Type == "Feuillus"],
  surface_CR_coniferes = df_per_type$surface[df_per_type$Type == "Conifères"],
  surface_CR_autres = df_per_type$surface[df_per_type$Type == "Autres / Mixtes"],
) %>%
  mutate(pourcentage_CR_foret_total = 100 * surface_CR_totale / surface_foret_ha,
         pourcentage_CR_foret_total_feuillus = 100 * surface_CR_feuillus / surface_foret_ha_feuillus,
         pourcentage_CR_foret_total_coniferes = 100 * surface_CR_coniferes / surface_foret_ha_coniferes,
         pourcentage_CR_foret_total_autres = 100 * surface_CR_autres / surface_foret_ha_autres,
         pourcentage_CR_foret_par_an = pourcentage_CR_foret_total / duree_suivi_y,
         pourcentage_CR_foret_par_an_feuillus = pourcentage_CR_foret_total_feuillus / duree_suivi_y,
         pourcentage_CR_foret_par_an_coniferes = pourcentage_CR_foret_total_coniferes / duree_suivi_y,
         pourcentage_CR_foret_par_an_autres = pourcentage_CR_foret_total_autres / duree_suivi_y,
         ha_par_an = surface_CR_totale / duree_suivi_y,
         temps_cycle = 100 / pourcentage_CR_foret_par_an,
         temps_restant = temps_cycle - duree_suivi_y)


jsonlite::toJSON(c(df_captage), auto_unbox = TRUE) %>% 
  prettify() %>%
  jsonlite::write_json(file.path("./site/communes_results", paste0(comm_id, "_df.json")))

saveRDS(map, file = file.path("./site/communes_results", paste0(comm_id, "_map.rds")))

saveRDS(c(df_captage), file = file.path("./site/communes_results", paste0(comm_id, "_df.rds")))


