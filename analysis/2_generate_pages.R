df <- read.csv("./site/comm_list.csv", header = TRUE)

lns <- readLines("./site/dev.qmd")

for(i in seq_len(nrow(df))) {
  output <- gsub("PLACEHOLDER_NAME", df$Nom[i], lns)
  output <- gsub("87153", df$Code[i], output)
  cat(output, file = paste0("./site/", df$Code[i], ".qmd"), sep = "\n")
}

geojson_files <- list.files(path = "./site/communes_results/", pattern = "\\_commune.geojson$", full.names = TRUE)
geojson_list <- lapply(geojson_files, sf::st_read, quiet = TRUE)
merged_geojson <- do.call(rbind, geojson_list)
sf::st_write(merged_geojson, dsn = "./site/communes_results/merged_commune.geojson", append = FALSE, quiet = TRUE)
