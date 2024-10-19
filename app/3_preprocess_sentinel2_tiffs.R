##### Get data from sentinel-hub

library(sf)
library(raster)
library(ggplot2)
library(terra)
library(dplyr)
library(data.table)


# List of folders containing 'default.tif' files
tif_folders <- list.dirs("C:/data/tiffs/", full.names = TRUE, recursive = FALSE)

tif_files <- list.files("C:/data/tiffs/", full.names = TRUE, recursive = TRUE, pattern = ".tif")

annot <- read.csv("data/band_annotation.csv")

get_dt_from_folder <- function(folder, polygon) {
  tif_file <- file.path(folder, "default.tif")
  
  if (!file.exists(tif_file)) {
    warning(paste("File does not exist:", tif_file))
    return(NA)
  }
  
  r1 <- try(terra::rast(tif_file), silent = TRUE)
  r <- try(
    terra::mask(terra::crop(r1, polygon), polygon),
    silent = TRUE
  )
  
  if (inherits(r, "try-error")) {
    warning(paste("Error reading raster stack for", tif_file))
    return(NA)
  }

  date <- as.Date(basename(folder), format = "%Y%m%d")
  
  raster_values <- terra::extract(r, seq_len(ncell(r)), xy = TRUE) |>
    data.table()
  
  names(raster_values) <- sapply(names(raster_values), function(x) {
    if(x %in% annot$col_name) return(annot$band_name[annot$col_name == x])
    else return(x)
  }, USE.NAMES = FALSE)
  
  raster_values[, c("ndvi", "ndmi", "date") := {
    ndvi = (B08 - B04)/(B08 + B04)
    ndmi = (B08 - B11)/(B08 + B11)
    list(ndvi, ndmi, date)
  }]
  # raster_values
  # saveRDS(raster_values, file = file.path(folder, "processed.rds"))
  return(raster_values[, c("x", "y", "B02", "B03", "B04", "ndvi", "ndmi", "date")])
}

shapefile_path <- 'data/cadastre-87153-parcelles.json'
shapefile <- st_read(shapefile_path)
polygon <- shapefile %>% filter(section == "E" & numero == 509)

val_list <- lapply(tif_folders, get_dt_from_folder, polygon)

df <- rbindlist(val_list[!is.na(val_list)])

### Cells annotation
# r <- try(terra::rast(tif_files[1]), silent = TRUE)
# terra::extract(r, seq_len(ncell(r)), xy = TRUE)


### Save object
# saveRDS(object = df, file = "data/all.rds")
ggplot(df %>% tidyr::drop_na(), aes(x = (x), y = (y), fill = ndvi)) +
  geom_tile() +
  facet_grid(lubridate::year(date) ~ lubridate::month(date, label = TRUE)) +
  scale_fill_distiller(palette = "PiYG", direction = 1,values = c(0.2, 1)) +
  # scale_fill_continuous(type = "viridis") +
  labs(
    title = "Evolution de la parcelle dans le temps",
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


df_summ <- df %>% 
  tidyr::drop_na() %>%
  group_by(date) %>%
  summarise(mean_ndvi = var(ndvi)) %>%
  mutate(year = lubridate::year(date), 
         month = lubridate::month(date))

ggplot(df_summ, aes(
  x = month,
  color = as.factor(year),
  fill = year,
  y = mean_ndvi
  )
) +
  geom_point(size = 2) +
  geom_step() +
  labs(
    title = "Evolution de la Parcelle dans le temps",
    x = "Date",
    y = "Value",
    color = "Band"
  ) +
  theme_minimal() +
  theme(#axis.title.x = element_blank(),
    #axis.text.x = element_blank(),
    #   axis.ticks.x = element_blank(),
    #   axis.title.y = element_blank(),
    #   axis.text.y = element_blank(),
    #   axis.ticks.y = element_blank(),
    #        panel.grid.major = element_blank(),
    #   panel.grid.minor = element_blank(),
        plot.background = element_rect(fill = "#F5EEE6"))


ggplot(df %>% tidyr::drop_na() %>% filter(ndvi > 0.5), aes(
  x = date,
  y = exp(ndvi)
)
) +
  geom_hex(bins = 100) +
  scale_fill_distiller(palette = "Spectral") +
  coord_fixed(ratio = 1000) +
  theme_minimal()


df %>% tidyr::drop_na()

ggplot(df %>% tidyr::drop_na() %>% filter(ndvi > 0.5) %>% mutate(month = lubridate::month(date)), aes(
  x = lubridate::floor_date(date, "month"),
  # group = lubridate::floor_date(date, "month"),
  y = ndvi,
  fill = ndvi
)
) +
  geom_smooth(method = "loess", span = 100) +
  scale_fill_distiller(palette = "Spectral") +
  theme_minimal()


ggplot(df %>% tidyr::drop_na() %>% mutate(month = lubridate::month(date)),
  aes(
    x = ndvi
  )
) +
  facet_grid(
    lubridate::year(date) ~ lubridate::month(date, label = TRUE),
    scales="free_y"
  ) +
  geom_freqpoly(bins = 30) +
  scale_y_log10() +
  theme_minimal()
?geom_histogram


ggplot(data = df, mapping = aes(x = ndmi, y = ndvi)) + 
  geom_hex() +
  scale_fill_distiller(palette = "Spectral", trans = "log10") +
  theme_minimal() + 
  facet_grid(lubridate::year(date) ~ lubridate::quarter(date))


ump <- uwot::umap(na.omit(df[,c("ndvi", "ndmi")]))

plot(ump, cex = 0.05, col = rgb (0, abs(na.omit(df[,c("ndvi")])), 0))

ggplot(data = df, mapping = aes(x = ndmi, y = ndvi)) + 
  geom_hex() +
  scale_fill_distiller(palette = "Spectral", trans = "log10") +
  theme_minimal()

