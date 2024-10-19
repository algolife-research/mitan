### Data analysis and visualisation
df

# Read the shapefile
shapefile_path <- 'data/cadastre-87153-parcelles.json'
shapefile <- st_read(shapefile_path)
polygon <- shapefile %>% filter(section == "E" & numero == 509)


# Mask the raster stack with the first polygon
raster_stack_masked <- try(
  terra::mask(terra::crop(raster_stack, polygon), polygon),
  silent = TRUE
)

unique_combinations <- unique(df[, .(x, y)])

library(sp)

# Define the data point
point <- SpatialPoints(coords = c(x, y), proj4string = CRS(proj4string(shapefile)))

# Check if the point is within any polygon
within_polygon <- over(point, shapefile)

# Plot for all bands
library(tidyr)
ggplot(all_bands_values %>% drop_na() %>% filter(band == 13), aes(x = (date), y = (value), group = as.factor(band), color = as.factor(band))) +
  # geom_line() +
  # geom_boxplot() +
  geom_smooth() +
  labs(title = "Evolution of All Bands Over Time", x = "Date", y = "Value", color = "Band") +
  theme_minimal()

ggplot(all_bands_values %>% drop_na() %>% filter(band == 13), aes(x = (x), y = (y), fill = value)) +
  geom_tile() +
  facet_grid(lubridate::year(date) ~ lubridate::month(date, label = TRUE)) +
  scale_fill_distiller(palette = "PiYG", direction = 1,values = c(0.2, 1)) +
  # scale_fill_continuous(type = "viridis") +
  labs(
    title = "Evolution de la Parcelle dans le temps",
    x = "Date",
    y = "Value",
    color = "Band"
  ) +
  theme_minimal() +
  coord_fixed(ratio = 1) +
  theme(axis.title.x = element_blank(),
        axis.text.x = element_blank(),
        axis.ticks.x = element_blank(),
        axis.title.y = element_blank(),
        axis.text.y = element_blank(),
        axis.ticks.y = element_blank(),
        panel.grid.major = element_blank(),
        panel.grid.minor = element_blank(),
        plot.background = element_rect(fill = "#F5EEE6"))
?scale_fill_continuous

library(leaflet)
library(ggplot2)
plt <- leaflet() %>% 
  setView(lng = 1.336, lat = 46.038, zoom = 16) %>%
  # addTiles() %>%
  addProviderTiles('Esri.WorldImagery') %>%
  addPolygons(
    data = cd_plot,
    weight = 1,
    color = "darkgrey",
    label = ~label_text,
    popup = ~popup_text,
    fillColor = ~pal(log1p(contenance)),#factpal(statut),
    fillOpacity = 1,
  ) #%>%
# addinput$xminRasterImage(rst2, opacity = 0.85)

## NDVI = NIR - RED / NIR + RED (B08 – B04)/(B08 + B04)
## NDMI = (NIR – SWIR) / (NIR + SWIR) Sentinel-2: NDMI = (B08 – B11)/(B08 + B11)

library(sp)
library(sf)
coordinates(df) <- ~x+y

shapefile_path <- 'data/cadastre-87153-parcelles.json'
shapefile <- st_read(shapefile_path)
polygon <- shapefile %>% filter(section == "E" & numero == 509)

dt_sf <- st_as_sf(df, coords = c("x", "y"), remove = FALSE)

dt_filtered <- dt_sf[st_within(dt_sf, polygon), ]

ggplot(data = df, aes(x = x, y =y))+                   #plot map
  geom_raster(fill = rgb(r = Red,
                         g = Green,
                         b = Blue,
                         maxColorValue = 255)),
show.legend = FALSE) +
  scale_fill_identity() + 
  ggtitle("Plot .tif rgb") +
  theme_minimal() -> Mapggsave(Map,                                            #save map
                               filename = paste0(here(), "/satellite_img.jpg"),
                               dpi = 200)




# Example data.table creation for illustration (replace with your actual data)
dt <- data.table(x = runif(100, min = -180, max = 180), y = runif(100, min = -90, max = 90))

# Convert data.table to sf object
points_sf <- st_as_sf(dt, coords = c("x", "y"), crs = st_crs(polygon))

# Perform the spatial join to keep only points within the polygons
points_within <- points_sf[st_within(points_sf, polygon, sparse = FALSE), ]

# If you need the result back in data.table format
result_dt <- as.data.table(st_drop_geometry(points_within))

# Print the result
print(result_dt)