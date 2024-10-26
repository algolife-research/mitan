### Utilities
suppressPackageStartupMessages({
  library(sf)
  library(leaflet) 
  require(httr)
  require(jsonlite)
  library(dplyr)
  library(terra)
  library(landscapemetrics)
})

get_token <- function(client_id, client_secret) {
  url <- "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token"
  
  # Define the body data
  body_data <- list(
    grant_type = "client_credentials",
    client_id = client_id,
    client_secret = client_secret
  )
  
  tk_response <- POST(
    url = url,
    add_headers(`content-type` = "application/x-www-form-urlencoded"),
    body = body_data,
    encode = "form"
  )
  
  return(content(tk_response)$access_token)
  
}

download_comm_ndvi <- function(
    comm_geom,
    min_date,
    max_date,
    output_dir,
    client_id,
    client_secret
) {
  
  message("Getting auth token...")
  tk <- get_token(client_id, client_secret)
  
  message("Getting dates...")
  dates <- request_sentinel_dates(
    min_date = min_date,
    max_date = max_date,
    comm_geom = geom,
    auth_token = tk
  )
  
  message("Getting NDVI...")
  
  bbox <- st_bbox(comm_geom)
  bbox2 <- transform_bbox(bbox)
  
  for(date in dates) {
    message(date)
    response <- ndvi_request(
      bbox = as.vector(bbox),
      width = bbox2$width / 10,
      height = bbox2$height / 10,
      from = date,
      to = paste0(as.Date(date) + 1, "T00:00:00Z"),
      name = gsub("-|:", "", date),
      auth_token = tk
    )
    
    write_extract_tar_response(
      response,
      file.path(output_dir)
    )
  }
  
  return(NULL)
}


request_sentinel_dates <- function(min_date, max_date, comm_geom, auth_token, max_cloud_cover = 25) {
  bbox <- st_bbox(comm_geom)
  bbox2 <- transform_bbox(bbox)
  
  get_date_iterations <- function(min_date, max_date) {
    min_date <- as.Date(min_date)
    max_date <- as.Date(max_date)
    start_year <- as.numeric(format(min_date, "%Y"))
    end_year <- as.numeric(format(max_date, "%Y"))
    
    output <- list()
    for (year in start_year:end_year) {
      if (year == start_year) {
        current_min_date <- min_date
      } else {
        current_min_date <- as.Date(paste0(year, "-01-01"))
      }
      
      # Determine the max date for the current year
      if (year == end_year) {
        current_max_date <- max_date
      } else {
        current_max_date <- as.Date(paste0(year, "-12-31"))
      }
      output[[1L + year - start_year]] <- c(current_min_date, current_max_date)
    }
    return(output)
  }
  date_ranges <- get_date_iterations(min_date, max_date)
  
  message("Catalog requests...")
  date_list <- list()
  for(i in seq_along(date_ranges)) {
    datetime <- paste0(
      date_ranges[[i]][1], 
      "T00:00:00Z/",
      date_ranges[[i]][2],
      "T00:00:00Z"
    )
    message(datetime)
    cat_list <- catalog_request(
      as.vector(bbox),
      datetime,
      max_cloud_cover = max_cloud_cover,
      distinct = "date",
      limit = 100,
      auth_token = auth_token
    )
    if(length(cat_list$features) == 0) {
      date_list[[i]] <- NA
    } else {
      date_list[[i]] <- paste0(cat_list$features, "T00:00:00Z")
    }
  }
  date_list <- unlist(date_list)
  date_list <- date_list[!is.na(date_list)]
  return(date_list)
}


catalog_request <- function(bbox, datetime, max_cloud_cover = 25, distinct = NULL, limit = 100, auth_token) {
  
  url <- "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search"
  
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'application/json'
  )
  
  body_data <- list(
    bbox = bbox,
    datetime = datetime,
    collections = list("sentinel-2-l2a"),
    limit = limit,
    distinct = distinct,
    filter = paste0("eo:cloud_cover < ", max_cloud_cover)
  )
  
  body_json <- toJSON(body_data, auto_unbox = TRUE)
  
  response <- POST(
    url = url,
    add_headers(headers),
    body = body_json,
    encode = "json"
  )
  
  r <- content(response, as = "text") %>%
    jsonlite::fromJSON()
  
  return(r)
  
}


transform_bbox <- function(bbox, crs_from = 4326, crs_to = 32736, rounding = -1) {
  require(sf)
  require(lwgeom)
  bbox_wgs84 <- st_bbox(c(xmin = bbox[1], ymin = bbox[3], 
                          xmax = bbox[2], ymax = bbox[4]), 
                        crs = st_crs(crs_from))
  
  bbox_sf <- st_as_sfc(bbox)
  bbox_transformed <- st_transform(bbox_sf, crs = st_crs(crs_to))
  
  width <- (st_bbox(bbox_transformed)$xmax - st_bbox(bbox_transformed)$xmin)
  height <- (st_bbox(bbox_transformed)$ymax - st_bbox(bbox_transformed)$ymin)
  
  transformed_coords <- st_bbox(bbox_transformed)
  rounded_coords <- round(transformed_coords, rounding)
  out <- rounded_coords %>%
    st_as_sfc() %>%
    st_transform(crs = crs_from)
  return(list(bbox = out, width = unname(width), height = unname(height)))
}



extract_comm_from_bdforet <- function(
    bd_path,
    comm_geom) {
  
  message("Loading BD...")
  bd_shp <- st_read(bd_path)
  crs_bd_shp <- st_crs(bd_shp)
  if (crs_bd_shp != "EPSG:4326") {
    bd_shp <- st_transform(bd_shp, crs = "EPSG:4326")
  }
  
  message("Finding intersection...")
  it <- st_intersection(x = bd_shp, y = comm_geom)
  
  message("Cleaning...")
  remove_linestrings_from_collection <- function(geometry) {
    if (sf::st_is(geometry, "GEOMETRYCOLLECTION")) {
      print(1)
      # Extract all geometries except LINESTRING and MULTILINESTRING
      geometry <- sf::st_collection_extract(geometry, "POLYGON")
    }
    return(geometry)
  }
  
  # Apply this function to the entire sf object
  it_cleaned <-  it %>%
    filter(st_geometry_type(.) != "MULTILINESTRING")
  it_cleaned$geometry <- sf::st_collection_extract(it$geometry, "POLYGON")
  it_cleaned <- sf::st_as_sf(it_cleaned)
  
  it_out <- sf::st_cast(it_cleaned, "POLYGON", warn = FALSE)
  return(it_out)
}



tiff_request <- function(
    bbox,
    width,
    height,
    from ="2022-10-01T00:00:00Z",
    to = "2022-10-31T00:00:00Z",
    name = "default",
    auth_token
) {
  
  url <- "https://services.sentinel-hub.com/api/v1/process"
  
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'multipart/form-data',
    'Accept' = 'application/tar'
  )
  
  body_data <- list(
    input = list(
      bounds = list(
        properties = list(
          crs = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          # crs = "http://www.opengis.net/def/crs/EPSG/0/32736"
        ),
        bbox = bbox
      ),
      data = list(
        list(
          type = "sentinel-2-l2a",
          dataFilter = list(
            timeRange = list(
              from = from,
              to = to
            )
          )
        )
      )
    ),
    output = list(
      width = width,
      height = height,
      responses = list(list(
        identifier = name,
        format = list(
          type = "image/tiff"
        ))
      )
    )
  )
  
  body_json <- toJSON(body_data, auto_unbox = TRUE)
  
  evalscript <- '//VERSION=3

  function setup() {
    return {
      input: [{
        bands: ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B8A", "B11", "B12"],
        units: "DN"
      }],
      output: {
        id: "default",
        bands: 12,
        sampleType: SampleType.UINT16
      }
    }
  }
  
  function evaluatePixel(sample) {
      return [ sample.B01, sample.B02, sample.B03, sample.B04, sample.B05, sample.B06, sample.B07, sample.B08, sample.B8A, sample.B09, sample.B11, sample.B12]
  }'
  
  response <- POST(
    url = url,
    add_headers(headers),
    body = list(
      request = body_json,
      evalscript = evalscript
    )
  )
  
  return(response)
  
}


write_extract_tar_response <- function(response, output_dir = ".") {
  tar_path <- tempfile()
  on.exit(unlink(tar_path))
  
  writeBin(content(response, "raw"), con = tar_path)
  untar(tar_path, exdir = output_dir)
  
  return(untar(tar_path, list = TRUE))
}




get_comm_shp <- function(insee_code = 87153, path = "./eau/commune-frmetdrom/COMMUNE_FRMETDROM.shp") {
  library(sf)
  comm <- sf::read_sf(path)
  geom <- comm[comm$INSEE_COM == 87153, ]$geometry
  return(geom)
}


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
  NAflag(r) <- na_flag
  freq_data <- terra::global(r, fun = "isNA") / ncell(r)
  many_nas <- which(freq_data > max_miss)
  scale_func <- function(x) { -1 + x / scale_factor }
  r_norm <- terra::app(r[[-many_nas]], scale_func, cores = TRUE)  
  
  rn <- mask(r_norm, bd_foret_shp)
  
  d <- as.Date(
    names(rn),
    format = "%Y%m%d"
  )
  d_months <- format(d, "%Y-%m")
  ndvi.y <- tapp(rn, index = d_months, fun = mean, na.rm = TRUE)
  time(ndvi.y) <- as.Date(
    paste0(gsub("X", "", names(ndvi.y)), ".15"),
    format = "%Y.%m.%d"
  )
  terra::writeRaster(ndvi.y, filename, overwrite = TRUE)
  return(ndvi.y)
}

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
        # clamped <- terra::clamp(prev, lower = min_past_ndvi, upper = Inf, values=FALSE)
        ndvi_diff[[i]] <- curr - prev
      }
    }
  }
  
  names(ndvi_diff) <- names(ndvi.y)
  ndvi_diff <- terra::rast(ndvi_diff)
  
  na_layers <- sapply(1:nlyr(ndvi_diff), function(i) {
    all(is.na(values(ndvi_diff[[i]])))
  })
  ndvi_diff_filtered <- ndvi_diff[[!na_layers]]
  
  return(ndvi_diff_filtered)
}


get_cr_mask <- function(ndvi_diff, diff_threshold = -0.5, min_pixels = 20) {
  cr_mask <- terra::app(ndvi_diff, function(x) ifelse(x < diff_threshold, 1, NA))
  
  na_layers <- sapply(1:nlyr(cr_mask), function(i) {
    all(is.na(values(cr_mask[[i]])))
  })
  # Keep only layers that do not contain only NA values
  cr_mask_clean <- cr_mask[[!na_layers]]
  
  dts <- as.Date(paste0(gsub("X", "", names(cr_mask_clean)), ".15"), format = "%Y.%m.%d")

  cr_mask_clean_merged_y <- terra::tapp(cr_mask_clean, format(dts, "%Y"), mean, na.rm = TRUE)
  cr_mask_clean_merged <- mean(cr_mask_clean, na.rm = TRUE)

  ## Remove small patches
  clusters <- patches(cr_mask_clean_merged, directions = 8)
  cluster_sizes <- freq(clusters)
  large_clusters <- cluster_sizes$value[cluster_sizes$count >= min_pixels]
  mask_large_clusters <- clusters %in% large_clusters
  
  cr_mask_clean_merged_filtered <- mask(
    c(cr_mask_clean_merged, cr_mask_clean_merged_y),
    mask_large_clusters,
    maskvalue = 0,
    updatevalue = NA
  )
  
  return(cr_mask_clean_merged_filtered)
}


# Function to calculate the bounding box of a 1 km radius around a point
get_bounding_box <- function(lat, lon, radius_km = 1) {
  lat_offset <- radius_km / 111 # Approx 111 km per degree of latitude
  lon_offset <- radius_km / (111 * cos(lat * pi / 180))
  
  north <- lat + lat_offset
  south <- lat - lat_offset
  east <- lon + lon_offset
  west <- lon - lon_offset
  
  list(north = north, south = south, east = east, west = west)
}


ndvi_request <- function(
    bbox,
    width,
    height,
    from ="2022-10-01T00:00:00Z",
    to = "2022-10-31T00:00:00Z",
    name = "default",
    auth_token
) {
  
  url <- "https://services.sentinel-hub.com/api/v1/process"
  
  headers <- c(
    'Authorization' = paste0('Bearer ', auth_token),
    'Content-Type' = 'multipart/form-data',
    'Accept' = 'application/tar'
  )
  
  body_data <- list(
    input = list(
      bounds = list(
        properties = list(
          crs = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          # crs = "http://www.opengis.net/def/crs/EPSG/0/32736"
        ),
        bbox = bbox
      ),
      data = list(
        list(
          type = "sentinel-2-l2a",
          dataFilter = list(
            timeRange = list(
              from = from,
              to = to
            )
          )
        )
      )
    ),
    output = list(
      width = width,
      height = height,
      responses = list(list(
        identifier = name,
        format = list(
          type = "image/tiff"
        ))
      )
    )
  )
  
  body_json <- toJSON(body_data, auto_unbox = TRUE)
  
  evalscript <- paste0('//VERSION=3
  function setup() {
    return {
      input: [{
        bands:["B04", "B08", "SCL"]
      }],
      output: {
        id: "', name, '",
        bands: 1,
        sampleType: SampleType.UINT8
      }
    }
  }
  function evaluatePixel(sample) {
    if ([2, 3, 6, 8, 9, 10].includes(sample.SCL) ){
      return [ 0 ]
    } else{
      let ndvi = 1 + (sample.B08 - sample.B04) / (sample.B08 + sample.B04)
      return [ ndvi * 255 / 2 ]
    }

  }')
  
  response <- POST(
    url = url,
    add_headers(headers),
    body = list(
      request = body_json,
      evalscript = evalscript
    )
  )
  return(response)
  
}

get_elevation_open <- function(lat, lon) {
  
  # prep_req <- paste0(lat, ",", lon, collapse = "|")
  prep_req <- paste0(
    "?lon=",
    paste0(lon[1], collapse = "|"),
    "&lat=",
    paste0(lat[1], collapse = "|"),
    "&resource=ign_rge_alti_wld&delimiter=|&indent=false&measures=false&zonly=true"
  )
  base_url <- "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json"
  url <- paste0(base_url, prep_req)
  
  test <- "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=1.48|1.49&lat=43.54|43.55&resource=ign_rge_alti_wld&delimiter=|&indent=false&measures=false&zonly=false"
  
  response <- GET(url)
  if (status_code(response) == 200) {
    elevation_data <- fromJSON(content(response, "text"), flatten = TRUE)
    if (length(elevation_data$elevations) > 0) {
      elevation <- elevation_data$elevations
    } else {
      elevation <- NA
    }
  } else {
    # Gestion des erreurs
    warning("Erreur lors de la récupération des données d'élévation")
    elevation <- NA
  }
  
  return(elevation)
}


convert_coordinates <- function(
    df,
    coord_names = c("X", "Y"),
    crs_from = 4326,
    crs_to = 32631
  ) {
  sf_points2 <- st_as_sf(df, coords = coord_names, crs = crs_from)
  sf_points_utm2 <- st_transform(sf_points2, crs = crs_to)
  df_out <- as.data.frame(st_coordinates(sf_points_utm2))
  return(df_out)
}




get_leaflet_map <- function(
    cr_mask,
    bd_shp_cropped,
    comm_geom
) {
  
  pal_cr <- colorNumeric(
    "Reds",
    domain = c(0, 1),
    na.color = "#00000000"
  )
  
  bd_shp_cropped$Type <- as.factor(bd_shp_cropped$Type)
  pal_foret <- colorFactor(c("steelblue", "chocolate", "forestgreen"), bd_shp_cropped$Type)
  
  popup_cr <- paste0("<br><strong>Surface de la perturbation (ha) : </strong>", 
                  round(cr_mask$area_cr / 1e4, 3),
                  "<br><br><strong>Type de forêt (BDForêt): </strong>", 
                  cr_mask$Type, 
                        "<br><strong>Essence (BDForêt) : </strong>", 
                  cr_mask$ESSENCE)
  
  popup <- paste0("<strong>Type de forêt (BDForêt) : </strong>", 
                  bd_shp_cropped$Type, 
                  "<br><strong>Essence (BDForêt) : </strong>", 
                  bd_shp_cropped$ESSENCE,
                  "<br><strong>Surface (ha) : </strong>", 
                  round(bd_shp_cropped$area / 1e4, 3))
  
  map <- leaflet() %>%
    
    addMapPane("background", zIndex = 1) %>%
    addMapPane("comm", zIndex = 100) %>%
    addMapPane("perturbations", zIndex = 200) %>%
    addMapPane("BD", zIndex = 100) %>%
    
    addProviderTiles(
      providers$Esri.WorldImagery,
      options = providerTileOptions(opacity = 0.8, pane = "background")
    ) %>%
    addScaleBar(position = "bottomleft") %>% 
    
    addPolygons(
      data = comm_geom,
      fillColor = "#00000000",
      stroke = TRUE,
      color = "white",
      weight = 2,
      options = list(pane = "comm")
    ) %>%
    
    addPolygons(
      data = bd_shp_cropped,
      fill = ~Type,
      fillColor = ~pal_foret(Type),
      fillOpacity = 0.3,
      weight = 0, 
      highlight = highlightOptions(
        weight = 0,
        fillOpacity = 0.5,
        bringToFront = TRUE
      ),
      group = "BD Forêt",
      popup = popup,
      options = list(pane = "BD")
    ) %>%
    
    addPolygons(
      data = cr_mask,
      fillColor = "firebrick",
      fillOpacity = 0.7,
      highlight = highlightOptions(
        weight = 0,
        fillOpacity = 1,
        bringToFront = TRUE
      ),
      stroke = FALSE,
      group = "Perturbations",
      popup = popup_cr,
      options = list(pane = "perturbations")
    ) %>%
    
    addLayersControl(
      overlayGroups = c("Perturbations", "BD Forêt"),
      options = layersControlOptions(collapsed = FALSE)
    )  %>%
    
    addLegend(
      data = bd_shp_cropped,
      pal = pal_foret,
      values = ~Type,
      group = "BD Forêt",
      position = "bottomright" 
    )
  
  return(map)
  
}


