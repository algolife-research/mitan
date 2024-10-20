df <- read.csv("./site/comm_list.csv", header = FALSE)

lns <- readLines("site/dev.qmd")

for(i in 1:nrow(df)) {
  
  output <- gsub("PLACEHOLDER_NAME", df$V2[i], lns)
  output <- gsub("PLACEHOLDER_ID", df$V1[i], output)

  cat(output, file = paste0("./site/", df$V1[i], ".qmd"), sep = "\n")

}


