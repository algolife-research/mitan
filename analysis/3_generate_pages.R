df <- read.csv("./site/comm_list.csv", header = TRUE)

lns <- readLines("./site/dev.qmd")

for(i in seq_len(nrow(df))) {
  output <- gsub("PLACEHOLDER_NAME", df$Nom[i], lns)
  output <- gsub("87153", df$Code[i], output)
  cat(output, file = paste0("./site/", df$Code[i], ".qmd"), sep = "\n")
}

