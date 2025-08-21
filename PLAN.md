## Snow Map – Improvement Plan

### Goals
- Make the app simple, pretty, intuitive, and fun while accurately visualizing places with year‑round snow.

### Prioritized work (Phase 1: quick wins)
1. Cluster and zoom UX
   - Increase `disableClusteringAtZoom` to 6–7 and reduce `maxClusterRadius` so clicking a cluster reliably reveals individual markers or spiderfies.
2. Results tied to what you see
   - Optional “Within view” toggle to filter markers and results to the current map bounds.
   - Show a live results count; add “Reset view” and “Clear” actions.
3. Choropleth consistency
   - Recompute country counts from the currently filtered list (search/regions/within‑view) and update on map move/zoom and filter changes.
4. Shareable state
   - Sync query, regions, map view, and within‑view to the URL; add “Copy link”.
5. Popup polish and performance
   - Cache Wikipedia summaries/thumbnails in `localStorage` for 24 hours to remove flicker and reduce requests.
6. Visual polish
   - Slightly smaller snow icons and gentler animation; small UI refinements for the new controls.

### Phase 2 (data and geography)
7. Data integrity
   - Curate `snowy-places.js` to perennial snow/glacier locations only; add basic metadata (`country`, `continent`, `elevationMeters`, `type`, `hasGlacier`).
8. Region accuracy
   - Replace heuristic region detection with point→country lookup using Natural Earth country polygons and a small `countryId→continent` map.

### Phase 3 (delight and accessibility)
9. Country interaction
   - Clicking a country filters markers/results to that country and briefly highlights its markers.
10. Mobile and a11y
   - Bottom‑sheet list on small screens; keyboard navigation, focus styles, ARIA roles; polite results updates.

### Acceptance criteria (for Phase 1)
- Clicking any cluster zooms to show individual markers or spiderfies; no confusing partial reclustering at the target level.
- Toggling search/regions/within‑view updates markers, results count, and choropleth together.
- Moving or zooming the map with “Within view” on updates the list and country shading.
- Copying the link shares the exact state; reloading restores that state.
- Popups appear instantly after first load due to caching.

### Implementation notes (Phase 1)
- Modify `index.html` to add: “Within view” toggle, “Reset view”, “Copy link”, and a results count badge.
- In `script.js`:
  - Tune marker cluster options.
  - Filter data by query, region, and optional bounds; recompute country counts from filtered list.
  - Update choropleth on filter/URL/map events; add URL state sync helpers.
  - Add `localStorage` caching to Wikipedia enrichment.
  - Add reset/clear/copy event handlers.
- In `style.css` add styles for new controls and minor marker animation tweak.


