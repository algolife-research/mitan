# Mitan

Mitan is an application to track the evolution of forest areas 
using satellite imagery at the community level.

## Workflow

For a given community:

- Get data from Sentinel-Hub: NDVI time series
- Detect forest perturbations
- Process results
- Auto-generate website page

## Roadmap

#### Forest perturbation detection

- Handle shadows
- Handle cloud pixels
- Handle water proximity
- Handle small holes

#### Processing

- get CR per year
- get CR dataframe function

#### App

- Script to autogenerate community page
