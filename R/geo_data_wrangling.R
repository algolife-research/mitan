#' Transform and Adjust Bounding Box
#'
#' Transforms the bounding box to a specified CRS, calculates width and height, and rounds coordinates.
#'
#' @param bbox Numeric vector. Bounding box coordinates as \code{c(xmin, ymin, xmax, ymax)}.
#' @param crs_from Integer. EPSG code of the source CRS. Default is 4326 (WGS84).
#' @param crs_to Integer. EPSG code of the target CRS. Default is 32736 (UTM zone 36S).
#' @param rounding Integer. Rounding precision for the transformed bounding box coordinates. Default is -1.
#' @return List. Contains the transformed bounding box as an sf object, and numeric width and height of the transformed box.
#' @examples
#' \dontrun{
#' transformed_bbox <- transform_bbox(c(2.0, 48.0, 3.0, 49.0), crs_from = 4326, crs_to = 32631)
#' }
#' @export
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




#' Extract Commune Area from BDForêt Dataset
#'
#' This function extracts the specified commune area from the BDForêt dataset by intersecting 
#' the commune geometry with the provided forest shapefile.
#'
#' @param bd_path Character. Path to the BDForêt shapefile.
#' @param comm_geom sf object. Geometry of the commune in WGS84 CRS.
#' @return sf object. Extracted geometry of the commune area with cleaned polygons.
#' @examples
#' \dontrun{
#' commune_area <- extract_comm_from_bdforet("path/to/bdforet.shp", commune_geom)
#' }
#' @export
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



#' Retrieve Commune Geometry by INSEE Code
#'
#' This function retrieves the geometry of a specified commune by matching the INSEE code in the given shapefile.
#'
#' @param insee_code Character. INSEE code for the commune.
#' @param path Character. Path to the shapefile containing commune geometries.
#' @return sf object. Geometry of the specified commune.
#' @examples
#' \dontrun{
#' commune_geom <- get_comm_shp(insee_code = "75056", path = "path/to/commune.shp")
#' }
#' @export
get_comm_shp <- function(insee_code = 87153, path = "./eau/commune-frmetdrom/COMMUNE_FRMETDROM.shp") {
  comm <- sf::read_sf(path)
  geom <- comm[comm$INSEE_COM == 87153, ]$geometry
  return(geom)
}




