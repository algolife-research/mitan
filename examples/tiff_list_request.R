library(httr)
library(jsonlite)



# Extract the tar file


# Define the path to the extracted TIFF files
tiff_path <- "path/to/your/extracted/tiff/files"

# List all the TIFF files in the directory
tiff_files <- list.files(".", pattern = "*lt.tif$", full.names = TRUE)

# Loop through the TIFF files and display them
for (tiff_file in tiff_files) {
  # Read the TIFF file as a raster
  raster <- raster(tiff_file, layer=0)
  
  # Plot the raster
  plot(raster)
}

par(mfrow=c(3,4))

s <- stack(raster(tiff_file, band=2), raster(tiff_file, band=3), raster(tiff_file, band=4))
plot((s))

?brick
df = brick(tiff_file)
plotRGB(df, interpolate = TRUE)

for(i in 1:12) {
  plot(raster(tiff_file, band=i))
  
}



