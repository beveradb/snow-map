document.addEventListener('DOMContentLoaded', () => {
	const map = L.map('map', { zoomControl: true }).setView([20, 0], 2);
	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}).addTo(map);

	// Ensure country polygons render below markers
	const countryPane = map.createPane('countries');
	countryPane.style.zIndex = 200;

	const sidebar = document.getElementById('sidebar');
	const app = document.getElementById('app');
	const toggleBtn = document.getElementById('toggle');
	const searchInput = document.getElementById('search');
	const regionCheckboxes = Array.from(document.querySelectorAll('.region-filter'));
	const suggestionsList = document.getElementById('suggestions-list');
	const surpriseBtn = document.getElementById('surprise');
	const locateBtn = document.getElementById('locate');

	toggleBtn.addEventListener('click', () => {
		const hidden = getComputedStyle(sidebar).display === 'none';
		sidebar.style.display = hidden ? 'block' : 'none';
		app.style.gridTemplateColumns = hidden ? '320px 1fr' : '0 1fr';
	});

	function getRegion(lat, lng) {
		if (lat <= -60) return 'Antarctica';
		if (lat >= 7 && lng < -25) return 'North America';
		if (lat < 12 && lng >= -92 && lng <= -34) return 'South America';
		if (lat > 35 && lng >= -25 && lng <= 45) return 'Europe';
		if (lat < 38 && lat > -35 && lng >= -20 && lng <= 52) return 'Africa';
		if ((lat <= 0 && lng >= 110 && lng <= 180) || (lat < -25 && lng >= 145 && lng <= 180)) return 'Oceania';
		return 'Asia';
	}

	// Country layer + choropleth
	let countriesLayer;
	let countryCounts = {};
	const colorScale = [
		{ max: 0, color: '#f0f4f8' },
		{ max: 1, color: '#dbeafe' },
		{ max: 3, color: '#bfdbfe' },
		{ max: 6, color: '#93c5fd' },
		{ max: 10, color: '#60a5fa' },
		{ max: Infinity, color: '#3b82f6' },
	];
	function getColorForCount(c) { return colorScale.find(s => c <= s.max).color; }

	function updateChoropleth() {
		if (!countriesLayer) return;
		countriesLayer.eachLayer(layer => {
			const id = layer.feature.id;
			const count = countryCounts[id] || 0;
			layer.setStyle({ fillColor: getColorForCount(count), cursor: 'pointer' });
		});
	}

	function buildLegend() {
		const legend = L.control({ position: 'bottomright' });
		legend.onAdd = function () {
			const div = L.DomUtil.create('div', 'leaflet-control legend');
			let html = '<strong>Snowy spots</strong><br>';
			let prev = -1;
			for (const step of colorScale) {
				const from = prev + 1;
				const to = step.max === Infinity ? '10+' : step.max;
				html += `<span class="swatch" style="background:${step.color}"></span>${from}–${to}<br>`;
				prev = step.max;
			}
			div.innerHTML = html;
			return div;
		};
		legend.addTo(map);
	}

	function selectCountry(feature, layer) {
		try {
			const bbox = layer.getBounds();
			map.fitBounds(bbox.pad(0.2));
			const gj = layer.toGeoJSON();
			const inside = snowyPlaces.filter(p => {
				try { return turf.booleanPointInPolygon(turf.point([p.lng, p.lat]), gj); } catch(_) { return false; }
			});
			renderResults(inside);
		} catch(_) {}
	}

	fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
		.then(r => r.json())
		.then(topology => {
			const geojson = topojson.feature(topology, topology.objects.countries);
			countriesLayer = L.geoJSON(geojson, {
				pane: 'countries',
				style: () => ({ color: '#cfd8dc', weight: 1, fillColor: '#f3f7fa', fillOpacity: 0.85, opacity: 1 }),
				onEachFeature: (f, l) => {
					l.on({
						mouseover: e => e.target.setStyle({ fillColor: '#e2f1ff' }),
						mouseout: () => updateChoropleth(),
						click: () => selectCountry(f, l)
					});
				}
			}).addTo(map);
			buildLegend();
			computeCountryCounts();
			updateChoropleth();
		});

	function createSnowDivIcon() {
		const svg = `
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="12" cy="12" r="6" fill="#f0f7ff"/>
				<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="#1e90ff" stroke-width="1.6" stroke-linecap="round"/>
			</svg>`;
		return L.divIcon({ className: 'snow', html: svg, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] });
	}

	const cluster = L.markerClusterGroup({
		showCoverageOnHover: false,
		maxClusterRadius: 45,
		disableClusteringAtZoom: 5,
		spiderfyOnMaxZoom: true,
		zoomToBoundsOnClick: true
	});
	map.addLayer(cluster);
	cluster.on('clusterclick', e => {
		if (map.getZoom() >= 5) {
			e.layer.spiderfy();
		} else {
			e.layer.zoomToBounds();
		}
	});

	let currentMarkers = [];
	let userLocation = null;

	function haversine(a, b) {
		const toRad = d => d * Math.PI/180;
		const R = 6371;
		const dLat = toRad(b[0]-a[0]);
		const dLon = toRad(b[1]-a[1]);
		const lat1 = toRad(a[0]);
		const lat2 = toRad(b[0]);
		const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
		return 2*R*Math.asin(Math.sqrt(h));
	}

	function enrichPopup(place) {
		const title = encodeURIComponent(place.name.replace(/,.*/,''));
		const wikiApi = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
		return fetch(wikiApi)
			.then(r => r.ok ? r.json() : null)
			.then(data => {
				if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
				return { url: data.content_urls?.desktop?.page, img: data.thumbnail?.source, desc: data.extract ? data.extract.slice(0, 180) + (data.extract.length > 180 ? '…' : '') : null };
			}).catch(() => null);
	}

	function computeCountryCounts() {
		if (!countriesLayer) return;
		countryCounts = {};
		const gj = countriesLayer.toGeoJSON();
		snowyPlaces.forEach(p => {
			const pt = turf.point([p.lng, p.lat]);
			for (const feature of gj.features) {
				try {
					if (turf.booleanPointInPolygon(pt, feature)) {
						countryCounts[feature.id] = (countryCounts[feature.id] || 0) + 1;
						break;
					}
				} catch(_) { }
			}
		});
	}

	function focusMarkerByName(name, targetZoom = 7) {
		const item = currentMarkers.find(x => x.place.name === name);
		if (!item) return;
		cluster.zoomToShowLayer(item.marker, () => {
			map.setView(item.marker.getLatLng(), targetZoom, { animate: true });
			item.marker.openPopup();
		});
	}

	function renderMarkers() {
		cluster.clearLayers();
		currentMarkers = [];
		const query = (searchInput.value || '').toLowerCase().trim();
		const allowed = new Set(regionCheckboxes.filter(cb => cb.checked).map(cb => cb.value));
		const icon = createSnowDivIcon();

		let filtered = snowyPlaces.filter(p => allowed.has(getRegion(p.lat, p.lng)) && (!query || p.name.toLowerCase().includes(query)));
		if (userLocation) {
			filtered = filtered
				.map(p => ({ p, d: haversine([userLocation.lat, userLocation.lng], [p.lat, p.lng]) }))
				.sort((a,b) => a.d - b.d)
				.map(x => x.p);
		}

		filtered.forEach(p => {
			const m = L.marker([p.lat, p.lng], { icon });
			m.on('click', async () => {
				m.bindPopup('<em>Loading…</em>').openPopup();
				const extra = await enrichPopup(p);
				const html = extra ?
					`<div class="popup-media">${extra.img ? `<img src="${extra.img}" alt="${p.name}">` : ''}<div class="meta"><strong>${p.name}</strong><br/><small>${getRegion(p.lat,p.lng)}</small><br/>${extra.desc ? extra.desc : ''}<br/>${extra.url ? `<a href="${extra.url}" target="_blank" rel="noopener">Learn more ↗</a>` : ''}</div></div>` :
					`<strong>${p.name}</strong><br/><small>${getRegion(p.lat,p.lng)}</small>`;
				m.setPopupContent(html);
			});
			cluster.addLayer(m);
			currentMarkers.push({ place: p, marker: m });
		});

		computeCountryCounts();
		updateChoropleth();

		renderResults(filtered);
	}

	function renderResults(list) {
		suggestionsList.innerHTML = '';
		list.slice(0, 30).forEach(p => {
			const li = document.createElement('li');
			li.className = 'result-card';
			li.innerHTML = `<strong>${p.name}</strong><br/><small>${getRegion(p.lat,p.lng)}</small>`;
			li.addEventListener('click', () => focusMarkerByName(p.name, 8));
			suggestionsList.appendChild(li);
		});
	}

	function renderSuggestions() {
		renderResults([...snowyPlaces].sort((a,b) => a.name.localeCompare(b.name)));
	}

	searchInput.addEventListener('input', renderMarkers);
	regionCheckboxes.forEach(cb => cb.addEventListener('change', renderMarkers));
	surpriseBtn.addEventListener('click', () => {
		const allowed = snowyPlaces.filter(p => {
			const region = getRegion(p.lat, p.lng);
			return regionCheckboxes.find(cb => cb.value === region)?.checked;
		});
		const pick = allowed[Math.floor(Math.random() * allowed.length)];
		if (!pick) return;
		focusMarkerByName(pick.name, 8);
	});
	locateBtn.addEventListener('click', () => {
		if (!navigator.geolocation) return alert('Geolocation not supported on this browser.');
		navigator.geolocation.getCurrentPosition(pos => {
			userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			map.setView([userLocation.lat, userLocation.lng], 6);
			renderMarkers();
		}, () => alert('Could not get your location.'));
	});

	const title = L.control({ position: 'topright' });
	title.onAdd = function () {
		this._div = L.DomUtil.create('div', 'info');
		this._div.innerHTML = '<h4>Year‑Round Snow Locations</h4>';
		return this._div;
	};
	title.addTo(map);

	renderMarkers();
	renderSuggestions();
});
