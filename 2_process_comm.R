source("./utils.R")

comm_id <- 87153
dptt <- "87"

data_dir <- "data"
communes_ndvi_dir <- "communes_ndvi"
communes_shp_dir <- "communes_shp"
sentinel_data_dir <- file.path(data_dir, communes_ndvi_dir, comm_id)

path <- file.path(data_dir, communes_shp_dir, paste0(comm_id, ".shp"))
comm <- sf::read_sf(path)
geom <- comm$geometry

bd_shp <- sf::read_sf(file.path(data_dir, communes_shp_dir, paste0(comm$INSEE_COM, "_bdforetv2.shp")))
bd_shp <- bd_shp[!bd_shp$TFV_G11 %in% c("Lande", "Formation herbacée"), ]

bd_shp$Type <- case_when(
  grepl(pattern = "feuillus|peupleraie", bd_shp$TFV_G11, ignore.case = TRUE) ~ "Feuillus",
  grepl(pattern = "conifères", bd_shp$TFV_G11, ignore.case = TRUE) ~ "Conifères",
  .default = "Autres / Mixtes"
)

#####
## Data analysis
ndvi_diff <- get_ndvi_diff(
  sentinel_data_dir,
  bd_shp,
  n_years_lag = 1,
  max_difference_days = 15,
  min_past_ndvi = 0.7
)

cr_mask <- get_cr_mask(
  ndvi_diff,
  -0.45,
  min_pixels = 10
)

map <- get_leaflet_map(cr_mask, bd_shp, comm_geom = comm$geometry)
map

cr_mask_conv <- terra::project(cr_mask, "EPSG:32631")

df_coupes_rases <- get_centroids(cr_mask_conv, directions = 8) %>%
  select(x, y) %>%
  rename(longitude = x, latitude = y)

df_coupes_rases$surface_ha <- lsm_p_area(cr_mask_conv, directions = 8)$value

coords_4326 <- convert_coordinates(df_coupes_rases, c("longitude", "latitude"), crs_from = "EPSG:32631", crs_to = "EPSG:4326")
res_elev <- get_elevation_open(lat = coords_4326$Y, lon = coords_4326$X)

df_coupes_rases <- df_coupes_rases |>
  mutate(altitude = res_elev)

## surface de foret
bd_shp$area <- st_area(bd_shp)


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
  surface_foret_ha_autres = as.vector(sum(bd_shp[bd_shp$Type == "Autres", ]$area)) / 1e4,
  surface_CR_feuillus = df_per_type$surface[df_per_type$Type == "Feuillus"],
  surface_CR_coniferes = df_per_type$surface[df_per_type$Type == "Conifères"],
  surface_CR_autres = df_per_type$surface[df_per_type$Type == "Autres"],
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
  jsonlite::write_json(file.path(data_dir, "communes_results", paste0(comm_id, "_df.json")))

saveRDS(map, file = file.path(data_dir, "communes_results", paste0(comm_id, "_map.rds")))

saveRDS(c(df_captage), file = file.path(data_dir, "communes_results", paste0(comm_id, "_df.rds")))
# crd <- data.frame(lon = 1.34, lat = 46.04)
# vals <- extract(ndvi_diff, crd) %>%
#   select(-ID)
# tp <- vals[!is.na(vals)]
# plot(tp, type = "s")
# 
# vals <- extract(ndvi_diff, 1:ncell(ndvi_diff)) 
# vals2 <- vals[!rowSums(is.na(vals)) == ncol(vals), ]
# matplot(t(vals2[sample(1:nrow(vals2), 200),]), type = "s", col =  rgb(0,0,0, 0.1), lwd = 1.2, lty = 1)
# matplot(vals2[sample(1:nrow(vals2), 1000),], type = "s", col =  rgb(0,0,0, 0.1), lwd = 1.2, lty = 1)
# tp <- vals[!is.na(vals)]
# plot(tp, type = "s")


### Plot over time
# library(basemaps)
# library(tidyterra)
# library(data.table)
# library(ggplot2)
# library(tidyr)

# square_extent_sf <- st_as_sf(as.polygons(ext(comm)))
# st_crs(square_extent_sf) <- 4326
# 
# bm_rast <- basemap_raster(
#   square_extent_sf,
#   map_service = "esri",
#   map_type = "world_imagery"
# ) %>%
#   as("SpatRaster")

# df_plot <- as.data.frame(cr_mask, xy = TRUE) %>%
#   pivot_longer(-(x:y), names_to = "variable", values_to = "value") %>%
#   mutate(variable = as.Date(paste0(gsub("X", "", variable), ".08.15"), format = "%Y.%m.%d"))
# 
# plt_cr_vs_time <- ggplot(df_plot, aes(x = (x), y = (y), fill = value)) +
#   geom_spatraster_rgb(data = project(bm_rast, "EPSG:4326"), alpha = 0.7) +
#   geom_tile() +
#   facet_wrap(~ lubridate::year(variable)) +
#   scale_fill_distiller(
#     palette = "Reds",
#     direction = 1,
#     values = c(-1, 1), na.value = "#00000000") +
#   labs(
#     title = "Evolution de la zone dans le temps",
#     x = "Date",
#     y = "Value",
#     color = "Band"
#   ) +
#   theme_minimal() +
#   coord_sf() +
#   theme(axis.title.x = element_blank(),
#         axis.text.x = element_blank(),
#         axis.ticks.x = element_blank(),
#         axis.title.y = element_blank(),
#         axis.text.y = element_blank(),
#         axis.ticks.y = element_blank(),
#         panel.grid.major = element_blank(),
#         panel.grid.minor = element_blank(),
#         plot.background = element_rect(fill = "white"))
# 
