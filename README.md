# Snow Map

This project aims to build a simple, pretty, intuitive, and fun interactive web app showing a world map, visualizing the places around the world which have snow all year round. It's designed for people who love snow and want to find their next snowy adventure.

The web app will be a static site, easily deployable on Cloudflare Pages, and will be available at `snowmap.beveradb.com`.

## Project Plan

1.  **Project Setup (Manual Steps for User)**
    *   Create a new public GitHub repository named `snow-map`.
    *   Initialize a local git repository and push this file.
    *   Connect the GitHub repository to Cloudflare Pages.
    *   Configure `snowmap.beveradb.com` as the custom domain.

2.  **Initial Web App Structure**
    *   Create `index.html` for the main page.
    *   Create `style.css` for styling.
    *   Create `script.js` for application logic.
    *   Create a `data` directory for storing geographical data.

3.  **Map Integration**
    *   Integrate the [Leaflet.js](https://leafletjs.com/) library for an interactive map.
    *   Choose and implement a visually appealing base map tile layer.

4.  **Data Acquisition and Visualization**
    *   Research and collect data on locations with year-round snow.
    *   Format the data into a usable format like GeoJSON.
    *   Display the snow locations on the map, for example using markers or polygons.
    *   Add popups with more information for each location.

5.  **Styling and User Experience**
    *   Design a simple, clean, and intuitive user interface.
    *   Ensure the map is responsive and works well on different screen sizes.

6.  **Deployment**
    *   Pushing to the `main` or `master` branch on GitHub will automatically deploy the site via Cloudflare Pages.
    *   Verify the application is live at `snowmap.beveradb.com`.

---

## Live

-   Production: https://snowmap.beveradb.com

## Current features

-   Interactive world map with a clean CARTO Voyager basemap
-   Country choropleth (pastel shading) by count of known year‑round snowy spots
-   Sidebar with search, region filters, and a dynamic results list
-   Marker clustering with spiderfy; individual markers open popups
-   “Surprise me” and “Use my location” quick actions
-   Popups enriched on demand using Wikipedia summary and thumbnail
-   Lightweight animated snowflake markers

## Run locally (hot reload)

This is a pure static app; you can run it locally with hot reload:

```bash
npx --yes browser-sync start --server . --files "index.html, style.css, script.js, data/*.js" --no-ui --no-open --port 5173
```

-   Open `http://localhost:5173` in your browser.
-   Edits to `index.html`, `style.css`, `script.js`, or files under `data/` auto‑reload the page.

## Tech

-   Map: [Leaflet](https://leafletjs.com/) + [leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
-   Basemap tiles: CARTO raster tiles (Voyager)
-   Choropleth + countries: `world-atlas` TopoJSON via `topojson-client`
-   Geometry helpers: `@turf/turf`
-   Content enrichment: Wikipedia REST API for summaries and images

## Data & attribution

-   Country boundaries: `world-atlas@2` (TopoJSON); © Natural Earth
-   Tiles: © OpenStreetMap contributors, © CARTO
-   Summaries/imagery: Wikipedia REST API
-   Snowy places: curated list in `data/snowy-places.js` (approximate; iterative)

## Roadmap / next

-   Improve visual polish (theming, typography, micro‑interactions)
-   Add activity tags (ski/snowboard, mountaineering, hike, sightseeing, etc.) and filters
-   Country/region deep linking and shareable URLs (persist map view + filters)
-   More locations and quality‑checked coordinates; optional data import from GLIMS/NSIDC
-   Better mobile layout and an intro/splash panel
