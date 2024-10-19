##### 
## Get cadastre

url_parcelles <- "https://cadastre.data.gouv.fr/data/etalab-cadastre/2024-04-01/geojson/communes/87/87153/cadastre-87153-parcelles.json.gz"
data_folder <- "data"
destfile <- file.path(data_folder, basename(url_parcelles))
download.file(url_parcelles, destfile)
R.utils::gunzip(destfile)

