## Get list of available communes

cr_files <- list.files("C:/mitan_data/CR/")
stats_files <- list.files("C:/mitan_data/STATS/")


comms <- union(
  gsub(pattern = "_cr.tif", replacement = "", cr_files),
  gsub(pattern = "_stats.csv", replacement = "", stats_files)
)

df <- read.csv("./v_commune_2023.csv")
colnames(df$COM)
library(dplyr)
df %>% 
  filter(COM %in% comms) %>%
  select(COM, NCCENR) %>%
  # relocate(2, 1) %>%
  rename(Code = COM, Nom = NCCENR) %>%
  write.csv(file = "./site/comm_list.csv", row.names = FALSE, quote = FALSE)
