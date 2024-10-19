library(shiny)
library(shinyWidgets)
library(leaflet)
library(dplyr)
library(ggplot2)
library(shinyjs)
library(bslib)
library(sf)
library(data.table)
library(terra)

dates <- gsub("T000000Z", "", list.files("C:/data/tiffs/"))

primary_color <- "#31363F"
secondary_color <- "#A78295"
light_color <- "#F2F1EB"
tertiary_color <- "#F97300"
dark_text_color <- "#27374D"

polygons <- sf::st_read("./data/cadastre-87153-parcelles.json")
polygons$ID <- seq_len(nrow(polygons)) 
centroids <- st_centroid(polygons)
centroid_coords <- colMeans(st_coordinates(centroids))

ui <- bootstrapPage(
  chooseSliderSkin(
    skin = "Flat",
    color = primary_color
  ),
  tags$style(
    type = "text/css",
    paste0("
        html, body {
          width:100%;height:100%
        }
        p, div, h1, h2, h3, h4 {
          color: ", light_color, ";  
        }
        div.item {
          color: ", dark_text_color, ";   
        }
        #controls {
          background-color: ", primary_color, ";

        }
        #time_slider {
          background-color: ", primary_color, ";
          border-radius: 0px;
          border: 0px;
          opacity: 1;
          padding: 10px 10px 10px 10px;
          margin: 0px 0px 0px 0px;
        }

        .card-body {
          background-color: ", light_color, ";
          padding: 5px 5px 5px 5px;
          border-radius: 3px;
          margin: 0px 0px 0px 0px;
        }
  ")),
  setBackgroundColor(primary_color),
  page_fillable(
  layout_sidebar(
  sidebar = bslib::sidebar(
    open = "always",
    id = "controls",
    HTML('<center><img src="./logo_mitan_2.png" width="70%"></center>'),
    br(),
    selectizeInput(
      width = "100%", 
      inputId = "commune",
      label = "Commune",
      c("St-Julien-le-Petit")
    ),
    selectizeInput(
      inputId = "parcelle",
      label = "Parcelle",
      paste0(polygons$section, polygons$numero),
      multiple = TRUE
    ),
    
    strong("Sélection des couches"),
    awesomeCheckbox(
      inputId = "check1",
      label = "Image satellite", 
      value = TRUE,
      status = "info"
    ),
    awesomeCheckbox(
      inputId = "check2",
      label = "Cadastre", 
      value = TRUE,
      status = "info"
    ),
    actionBttn(
      size = "sm",
      inputId = "coupe",
      label = "Détecter les coupes rases", 
      # style = "minimal",
      color = "danger",
      icon = icon("tree")
    ),
    
    strong("Téléchargement"),
    actionBttn(
      size = "sm",
      inputId = "report1",
      label = "Rapport de parcelle", 
      style = "minimal",
      color = "default",
      icon = icon("file")
    )
    
    
  ),
  layout_column_wrap(
    width = 1/2,
    height = "80%",
    card(
      full_screen = TRUE,
      class = "cards",
      height = "100%",
      leafletOutput(
        "bkgd_map",
        width = "100%",
        height = "100%"
      )
    ),
    card(
      full_screen = TRUE,
      class = "cards",
      height = "100%",
      shinycssloaders::withSpinner(
        plotOutput(
          "plot"
        ),
        type = 6,
        size = 0.8,
        color = primary_color,
        color.background = light_color
      )
    )
  ),
  
  card(
    class = "cards",
    height = "20%",
    
    sliderTextInput(
      width = "100%",
      inputId = "time",
      label = "", 
      choices = dates
    )
  )

  ))
)


server <- function(input, output, session) {


  
  clicked_ids <- reactiveValues(ids = vector())
  
  output$bkgd_map <- renderLeaflet({
    leaflet(
      options = leafletOptions(zoomControl = FALSE)
    ) %>%
      # setView(centroid_coords[1], centroid_coords[2], zoom = 13) %>%
        addProviderTiles(providers$OpenStreetMap) %>%
      addPolygons(
        data = polygons,
        layerId = ~ID,
        color = "#444444", # Border color
        weight = 0.2,        # Border width
        smoothFactor = 0.2,
        opacity = 1.0,
        fillOpacity = 0.05,
        fillColor = "blue",
        highlightOptions = highlightOptions(color = "white", weight = 2, bringToFront = TRUE)
      )
  })
  
  # Observe click events on the polygons
  # observeEvent(clicked_ids(), {
    # click <- clicked_ids()
    # if (!is.null(click$id)) {
      # selected_polygon <- polygons[as.numeric(click$id), ]
      # print(click$id)
      # selected_polygon <- st_union(selected_polygon)
      # 
      # val_list <- lapply(tif_folders, get_dt_from_folder, selected_polygon)
      # df <- rbindlist(val_list[!is.na(val_list)])

  output$plot2 <- renderPlot({
    tif_folders[grep(input$date)]
    
  })

      # Render the plot
      output$plot <- renderPlot({
        req(clicked_ids$ids)
        selected_polygon <- polygons[clicked_ids$ids, ]
        
        # selected_polygon <- st_union(selected_polygon)
        val_list <- lapply(tif_folders, get_dt_from_folder, selected_polygon)
        df <- rbindlist(val_list[!is.na(val_list)])
        ggplot(df %>% tidyr::drop_na(), aes(x = (x), y = (y), fill = ndvi)) +
          geom_tile() +
          facet_grid(lubridate::year(date) ~ lubridate::month(date, label = TRUE)) +
          scale_fill_distiller(palette = "PiYG", direction = 1,values = c(0.2, 1)) +
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
                plot.background = element_rect(fill = light_color))
      }
      )
      
      # Show the popup panel
      show("popup_panel")
    # }
  # })
  
  clicked_ids <- reactiveValues(ids = vector())
  
  observeEvent(input$bkgd_map_shape_click, {
    
    #create object for clicked polygon
    click <- input$bkgd_map_shape_click
    
    #define leaflet proxy for second regional level map
    proxy <- leafletProxy("bkgd_map")
    
    #append all click ids in empty vector
    clicked_ids$ids <- c(clicked_ids$ids, click$id) # name when clicked, id when unclicked
    
    #shapefile with all clicked polygons - original shapefile subsetted by all admin names from the click list
    clicked_polys <- polygons %>%
      filter(ID %in% clicked_ids$ids)
    print(clicked_polys)
    #if the current click ID [from CNTY_ID] exists in the clicked polygon (if it has been clicked twice)
    # if(click$id %in% clicked_polys$ID){
    #   
    #   #define vector that subsets NAME that matches CNTY_ID click ID - needs to be different to above
    #   name_match <- clicked_polys$ID[clicked_polys$ID == click$id]
    #   
    #   #remove the current click$id AND its name match from the clicked_polys shapefile
    #   clicked_ids$ids <- clicked_ids$ids[!clicked_ids$ids %in% click$id]
    #   clicked_ids$ids <- clicked_ids$ids[!clicked_ids$ids %in% name_match]
    #   
    #   # just to see
    #   # print(clicked_ids$ids)
    #   
    #   # update
    #   updateSelectizeInput(session,
    #                        inputId = "parcelle",
    #                        label = "",
    #                        choices = paste0(polygons$section, polygons$numero),
    #                        selected = paste0(polygons$section, polygons$numero)[polygons$ID == clicked_ids$ids])
    #   
    #   #remove that highlighted polygon from the map
    #   proxy %>% removeShape(layerId = click$id)
    #   
    # } else {
      
      #map highlighted polygons
      proxy %>% addPolygons(data = clicked_polys,
                            fillColor = "red",
                            fillOpacity = 0.5,
                            weight = 1,
                            color = "black",
                            stroke = TRUE,
                            layerId = clicked_polys$ID)
      
      # just to see
      print(clicked_ids$ids)
      
      # update
      updateSelectizeInput(session,
                           inputId = "clicked_locations",
                           label = "",
                           choices = paste0(polygons$section, polygons$numero),
                           selected = paste0(polygons$section, polygons$numero)[polygons$ID %in% clicked_ids$ids])
      
    # } #END CONDITIONAL
  })
  
  
}



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

# shapefile_path <- 'data/cadastre-87153-parcelles.json'
# shapefile <- st_read(shapefile_path)
# polygon <- shapefile %>% filter(section == "E" & numero == 509)

# val_list <- lapply(tif_folders, get_dt_from_folder, polygon)
# 
# df <- rbindlist(val_list[!is.na(val_list)])



shinyApp(ui = ui, server = server)
