#' Aggregate NDVI Data Over Time
#'
#' This function aggregates NDVI data from multiple TIFF files, masks non-forest areas, normalizes, and calculates monthly averages.
#'
#' @param data_dir Character. Directory containing NDVI TIFF files.
#' @param bd_foret_shp sf object. Shapefile containing the forest area for masking.
#' @param na_flag Numeric. Value to mark missing pixels. Default is 0.
#' @param max_miss Numeric. Maximum allowable proportion of NA pixels in each raster layer. Default is 0.5.
#' @param scale_factor Numeric. Scaling factor for normalization. Default is 127.5.
#' @param filename Character. Output file path for the aggregated NDVI raster. Default is "./ndvi_aggregated.tif".
#' @return terra::SpatRaster. Aggregated and masked NDVI data.
#' @examples
#' \dontrun{
#' ndvi_agg <- aggregate_ndvi(
#'   data_dir = "ndvi_files",
#'   bd_foret_shp = forest_shapefile,
#'   filename = "aggregated_ndvi.tif"
#' )
#' }
#' @export
aggregate_ndvi <- function(
    data_dir,
    bd_foret_shp,
    na_flag = 0,
    max_miss = 0.50,
    scale_factor = (255 / 2),
    filename = "./ndvi_aggregated.tif"
) {
  
  lst <- list.files(
    path = data_dir,
    pattern = '.tif$',
    full.names = TRUE
  )
  
  r <- terra::rast(lst)
  terra::NAflag(r) <- na_flag
  freq_data <- terra::global(r, fun = "isNA") / terra::ncell(r)
  many_nas <- which(freq_data > max_miss)
  scale_func <- function(x) { -1 + x / scale_factor }
  r_norm <- terra::app(r[[-many_nas]], scale_func, cores = TRUE)  
  
  rn <- terra::mask(r_norm, bd_foret_shp)
  
  d <- as.Date(
    names(rn),
    format = "%Y%m%d"
  )
  d_months <- format(d, "%Y-%m")
  ndvi.y <- terra::tapp(rn, index = d_months, fun = mean, na.rm = TRUE)
  terra::time(ndvi.y) <- as.Date(
    paste0(gsub("X", "", names(ndvi.y)), ".15"),
    format = "%Y.%m.%d"
  )
  terra::writeRaster(ndvi.y, filename, overwrite = TRUE)
  return(ndvi.y)
}


#' Calculate NDVI Differences Between Years
#'
#' Calculates the differences in NDVI values over a specified lag period, filtering based on a minimum NDVI threshold.
#'
#' @param ndvi.y terra::SpatRaster. Aggregated NDVI data with monthly time steps.
#' @param n_years_lag Integer. Lag period in years for comparison. Default is 1.
#' @param max_difference_days Integer. Maximum allowable days for difference matching. Default is 15.
#' @param min_past_ndvi Numeric. Minimum NDVI threshold for historical comparison. Default is 0.7.
#' @return terra::SpatRaster. NDVI difference layers.
#' @examples
#' \dontrun{
#' ndvi_diff <- get_ndvi_diff(ndvi_agg, n_years_lag = 1, min_past_ndvi = 0.7)
#' }
#' @export
get_ndvi_diff <- function(
    ndvi.y,
    n_years_lag = 1,
    max_difference_days = 15,
    min_past_ndvi = 0.7
) {
  
  dates <- as.Date(paste0(gsub("X", "", names(ndvi.y)), ".15"), format = "%Y.%m.%d")
  
  ndvi_diff <- list()
  
  for (i in seq_along(dates)) {
    date_prev <- dates[i] - (n_years_lag * 365L)
    ddff <- dates - date_prev
    index_prev <- which(ddff <= 0 & ddff > (-65))
    ddff <- dates - dates[i]
    index_curr <- which(ddff <= 0 & ddff > (-65))
    
    if (any(abs(dates[index_prev] - date_prev) <= max_difference_days)) {
      if(length(index_prev) > 0) {
        prev <- terra::app(ndvi.y[[index_prev]], mean, na.rm = TRUE)
        curr <- terra::app(ndvi.y[[index_curr]], mean, na.rm = TRUE)
        ndvi_diff[[i]] <- curr - prev
      }
    } else {
      ndvi_diff[[i]] <- NA
    }
  }
  
  names(ndvi_diff) <- names(ndvi.y)
  ndvi_diff <- terra::rast(ndvi_diff)
  
  na_layers <- sapply(1:terra::nlyr(ndvi_diff), function(i) {
    all(is.na(terra::values(ndvi_diff[[i]])))
  })
  ndvi_diff_filtered <- ndvi_diff[[!na_layers]]
  
  return(ndvi_diff_filtered)
}




#' Generate Change Region Mask Based on NDVI Difference Threshold
#'
#' This function creates a mask highlighting areas where the NDVI difference exceeds a specified threshold,
#' and filters out small regions based on minimum pixel size.
#'
#' @param ndvi_diff terra::SpatRaster. Raster containing NDVI difference values.
#' @param diff_threshold Numeric. Threshold for NDVI difference to define a change region. Default is -0.5.
#' @param min_pixels Integer. Minimum number of pixels for regions to be retained. Default is 20.
#' @return terra::SpatRaster. Masked raster indicating regions with significant NDVI change.
#' @examples
#' \dontrun{
#' change_mask <- get_cr_mask(ndvi_diff, diff_threshold = -0.5, min_pixels = 20)
#' }
#' @export
get_cr_mask <- function(ndvi_diff, diff_threshold = -0.45, min_pixels = 20) {
  
  cr_mask <- terra::ifel(ndvi_diff < diff_threshold, 1, NA)
  
  na_layers <- sapply(1:terra::nlyr(cr_mask), function(i) {
    all(is.na(terra::values(cr_mask[[i]])))
  })
  # Keep only layers that do not contain only NA values
  cr_mask_clean <- cr_mask[[!na_layers]]
  
  dts <- as.Date(paste0(gsub("X", "", names(cr_mask_clean)), ".15"), format = "%Y.%m.%d")
  
  # cr_mask_clean_merged_y <- terra::tapp(cr_mask_clean, format(dts, "%Y"), mean, na.rm = TRUE)
  
  cr_mask_clean_merged_ym <- terra::tapp(cr_mask_clean, format(dts, "%Y.%m"), mean, na.rm = TRUE)
  cr_mask_clean_merged <- terra::mean(cr_mask_clean, na.rm = TRUE)
  
  ## Remove small patches
  clusters <- terra::patches(cr_mask_clean_merged, directions = 8)
  cluster_sizes <- terra::freq(clusters)
  large_clusters <- cluster_sizes$value[cluster_sizes$count >= min_pixels]
  mask_large_clusters <- terra::`%in%`(clusters, large_clusters)
  
  cr_mask_clean_merged_filtered <- terra::mask(
    c(cr_mask_clean_merged, cr_mask_clean_merged_ym),
    mask_large_clusters,
    maskvalue = 0,
    updatevalue = NA
  )
  
  return(cr_mask_clean_merged_filtered)
}




#' Post-process Change Regions into Polygons with Area and Date Metadata
#'
#' This function processes the change region mask to generate polygons with area, centroid, 
#' and temporal metadata.
#'
#' @param cr_mask terra::SpatRaster. Mask raster with detected change regions.
#' @param min_area Numeric. Minimum area in square meters for retaining a polygon. Default is 1000.
#' @return sf object. Polygons with attributes for area, centroid coordinates, and dates of change.
#' @examples
#' \dontrun{
#' processed_polygons <- postprocess_cr(cr_mask, min_area = 1000)
#' }
#' @export
postprocess_cr <- function(cr_mask, min_area = 1000) {
  polygon_list <- list()
  merged_mask <- terra::app(cr_mask, mean, na.rm = TRUE)
  clumped_layer <- terra::patches(merged_mask, directions = 8)
  
  layer_polygons <- terra::as.polygons(clumped_layer, dissolve = TRUE)
  layer_polygons_filled <- terra::fillHoles(layer_polygons)
  
  layer_polygons_filled$dr <- NA
  for (i in 1:terra::nlyr(cr_mask)) {
    layer <- cr_mask[[i]]
    layer_name <- names(cr_mask)[i]
    active_polygons <- terra::as.polygons(terra::patches(layer, directions = 8), dissolve = TRUE)
    idx <- terra::is.related(layer_polygons_filled, active_polygons, "intersects")
    layer_polygons_filled$dr[idx] <- paste0(layer_polygons_filled$dr[idx], "", layer_name)
  }
  
  polygon_areas <- terra::expanse(layer_polygons_filled, unit = "m")
  
  polygon_centroids <- terra::centroids(layer_polygons_filled)
  centroid_coords <- terra::crds(polygon_centroids)  # Extract coordinates as matrix
  
  idx <- polygon_areas > min_area
  layer_polygons_filled <- layer_polygons_filled[idx, ]
  layer_polygons_filled$area_m2 <- polygon_areas[idx]
  layer_polygons_filled$centroid_x <- centroid_coords[idx, 1]
  layer_polygons_filled$centroid_y <- centroid_coords[idx, 2]
  
  df_tmp <- do.call(rbind, lapply(strsplit(gsub("NAX", "", layer_polygons_filled$dr), "X"), function(x) {
    dates <- as.Date(paste0(x, ".01"), format = "%Y.%m.%d")
    min_date <- min(dates)
    max_date <- max(dates)
    middle_date <- as.Date((as.numeric(min_date) + as.numeric(max_date + 30.5)) / 2, origin = "1970-01-01")
    
    list(
      start = format.Date(min_date, "%Y.%m"),
      end = format.Date(max_date, "%Y.%m"),
      mid = format.Date(middle_date, "%Y.%m"),
      year = format.Date(middle_date, "%Y")
    )
  }))
  
  layer_polygons_filled <- cbind(layer_polygons_filled, df_tmp)
  
  return(layer_polygons_filled)
}


#' Generate Leaflet Map with Change Regions and Forest Types
#'
#' This function creates an interactive Leaflet map displaying change regions with NDVI thresholding,
#' along with forest type areas from BDForêt data.
#'
#' @param cr_mask sf object. Spatial polygons of change regions with attributes.
#' @param bd_shp_cropped sf object. Cropped shapefile of forest areas with BDForêt attributes.
#' @param comm_geom sf object. Geometry of the commune to be outlined.
#' @return leaflet object. Interactive map with layers for change regions, forest types, and commune boundaries.
#' @examples
#' \dontrun{
#' map <- get_leaflet_map(change_regions, forest_types, commune_boundary)
#' }
#' @export
get_leaflet_map <- function(
    cr_mask,
    bd_shp_cropped,
    comm_geom
) {
  
  pal_cr <- leaflet::colorNumeric(
    "Reds",
    domain = c(0, 1),
    na.color = "#00000000"
  )
  
  bd_shp_cropped$Type <- as.factor(bd_shp_cropped$Type)
  pal_foret <- leaflet::colorFactor(c("steelblue", "chocolate", "forestgreen"), bd_shp_cropped$Type)
  
  popup_cr <- paste0("<strong>Perturbation</strong><br><br><strong>Période : </strong>", paste0(cr_mask$start, " - ", cr_mask$end),"<br><strong>Surface (ha) : </strong>", 
                     round(cr_mask$area_m2 / 1e4, 3),
                     "<br><br><strong>Type de forêt (BDForêt) : </strong>", 
                     cr_mask$Type, 
                     "<br><strong>Essence (BDForêt) : </strong>", 
                     cr_mask$ESSENCE)
  
  popup <- paste0("<strong>Type de forêt (BDForêt) : </strong>", 
                  bd_shp_cropped$Type, 
                  "<br><strong>Essence (BDForêt) : </strong>", 
                  bd_shp_cropped$ESSENCE,
                  "<br><strong>Surface (ha) : </strong>", 
                  round(bd_shp_cropped$area / 1e4, 3))
  
  map <- leaflet::leaflet() %>%
    
    leaflet::addMapPane("background", zIndex = 1) %>%
    leaflet::addMapPane("comm", zIndex = 100) %>%
    leaflet::addMapPane("perturbations", zIndex = 200) %>%
    leaflet::addMapPane("BD", zIndex = 100) %>%
    
    leaflet::addProviderTiles(
      leaflet::providers$Esri.WorldImagery,
      options = leaflet::providerTileOptions(opacity = 0.8, pane = "background")
    ) %>%
    leaflet::addScaleBar(position = "bottomleft") %>% 
    
    leaflet::addPolygons(
      data = comm_geom,
      fillColor = "#00000000",
      stroke = TRUE,
      color = "white",
      weight = 2,
      options = list(pane = "comm")
    ) %>%
    
    leaflet::addPolygons(
      data = bd_shp_cropped,
      fill = ~Type,
      fillColor = ~pal_foret(Type),
      fillOpacity = 0.3,
      weight = 0, 
      highlight = leaflet::highlightOptions(
        weight = 0,
        fillOpacity = 0.5,
        bringToFront = TRUE
      ),
      group = "BD Forêt",
      popup = popup,
      options = list(pane = "BD")
    ) %>%
    
    leaflet::addPolygons(
      data = cr_mask,
      fillColor = "firebrick",
      fillOpacity = 0.9,
      highlight = leaflet::highlightOptions(
        weight = 0,
        fillOpacity = 1,
        bringToFront = TRUE
      ),
      stroke = FALSE,
      group = "Perturbations",
      popup = popup_cr,
      options = list(pane = "perturbations")
    ) %>%
    
    leaflet::addLayersControl(
      overlayGroups = c("Perturbations", "BD Forêt"),
      options = leaflet::layersControlOptions(collapsed = FALSE)
    )  %>%
    
    leaflet::addLegend(
      data = bd_shp_cropped,
      pal = pal_foret,
      values = ~Type,
      group = "BD Forêt",
      position = "bottomright" 
    )
  
  return(map)
  
}

#' Update or append CSV
#' @export
update_or_append_csv <- function(new_data, file_path) {
  if (file.exists(file_path)) {
    existing_data <- read.csv(file_path, stringsAsFactors = FALSE)
    if (!"comm_code" %in% colnames(existing_data)) {
      stop("The existing CSV does not have a 'comm_code' column.")
    }
    new_data$comm_code <- as.numeric(new_data$comm_code)
    updated_data <- existing_data %>%
      filter(!(comm_code %in% new_data$comm_code )) %>%  
      bind_rows(new_data)
    write.csv(updated_data, file_path, row.names = FALSE, quote = FALSE)
  } else {
    write.csv(new_data, file_path, row.names = FALSE, quote = FALSE)
  }
}

#' get_summary_stats
#' @export
get_summary_stats <- function(cr_mask_pr, comm_code, ndvi_diff, bd_shp) {
  require(jsonlite)
  res_elev <- get_elevation_open(lat = cr_mask_pr$centroid_y, lon = cr_mask_pr$centroid_x)
  cr_mask_pr$altitude = res_elev
  
  surface_comm <- get_surface_commune(comm_code)
  taux_boisement <- sum(bd_shp$area)/1e4 / surface_comm
  
  dts_suivi <- paste0(gsub("X", "", names(ndvi_diff)), ".15") %>%
    as.Date(format = "%Y.%m.%d")
  
  Sys.setlocale("LC_TIME", "fr_FR.UTF-8")
  rng <- format(range(dts_suivi), "%B %Y")
  
  duree_suivi_y <- diff(range(dts_suivi)) / 365
  
  all_types <- c("Feuillus", "Conifères", "Autres / Mixtes")
  
  df_cr <- tibble(cr_mask_pr) %>%
    select(-geometry) %>%
    group_by(Type) %>%
    summarise(area = sum(area_m2) / 1e4) %>%
    right_join(tibble(Type = all_types), by = "Type") %>% 
    mutate(area = tidyr::replace_na(area, 0)) 
  
  df_ft <- tibble(bd_shp) %>%
    select(-geometry) %>%
    group_by(Type) %>%
    summarise(area = sum(area) / 1e4) %>%
    right_join(tibble(Type = all_types), by = "Type") %>% 
    mutate(area = tidyr::replace_na(area, 0))
  
  df_out <- tibble(
    comm_code = as.character(comm_code),
    debut_suivi = rng[1],
    fin_suivi = rng[2],
    surface_comm = surface_comm,
    taux_boisement = taux_boisement,
    suivi_y = as.numeric(duree_suivi_y),
    F_area = sum(df_ft$area),
    F_area_fe = df_ft$area[df_ft$Type == "Feuillus"],
    F_area_co = df_ft$area[df_ft$Type == "Conifères"],
    F_area_au = df_ft$area[df_ft$Type == "Autres / Mixtes"],
    CR_area = sum(df_cr$area),
    CR_area_fe = df_cr$area[df_cr$Type == "Feuillus"],
    CR_area_co = df_cr$area[df_cr$Type == "Conifères"],
    CR_area_au = df_cr$area[df_cr$Type == "Autres / Mixtes"],
  ) %>%
    mutate(
      CR_pc = 100 * CR_area / F_area,
      CR_pc_fe = 100 * CR_area_fe / F_area_fe,
      CR_pc_co = 100 * CR_area_co / F_area_co,
      CR_pc_au = 100 * CR_area_au / F_area_au,
      CR_pc_py = CR_pc / suivi_y,
      CR_pc_py_fe = CR_pc_fe / suivi_y,
      CR_pc_py_co = CR_pc_co / suivi_y,
      CR_pc_py_au = CR_pc_au / suivi_y,
      CR_area_py = CR_area / suivi_y,
      cycle_y = 100 / CR_pc_py,
      time_left = cycle_y - suivi_y
    )
  
  return(df_out)
}
