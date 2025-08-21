document.addEventListener('DOMContentLoaded', () => {
	const initialCenter = [20, 0];
	const initialZoom = 2;
	const map = L.map('map', { zoomControl: true }).setView(initialCenter, initialZoom);
	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}).addTo(map);

	// Ensure country polygons render below markers
	const countryPane = map.createPane('countries');
	countryPane.style.zIndex = 200;
	
	// Create a markers pane to ensure markers render above countries
	const markersPane = map.createPane('markers');
	markersPane.style.zIndex = 400;

	const sidebar = document.getElementById('sidebar');
	const app = document.getElementById('app');
	const toggleBtn = document.getElementById('toggle');
	const searchInput = document.getElementById('search');
	const regionCheckboxes = Array.from(document.querySelectorAll('.region-filter'));
	const suggestionsList = document.getElementById('suggestions-list');
	const surpriseBtn = document.getElementById('surprise');
	const locateBtn = document.getElementById('locate');
	const withinView = document.getElementById('within');
	const resetBtn = document.getElementById('reset');
	const copyBtn = document.getElementById('copy');
	const clearBtn = document.getElementById('clear');
	const resultsCountEl = document.getElementById('results-count');
	const themeToggle = document.getElementById('theme-toggle');
	const clusteringToggle = document.getElementById('clustering');

	// Theme toggle functionality
	const initTheme = () => {
		const savedTheme = localStorage.getItem('theme') || 'light';
		document.documentElement.setAttribute('data-theme', savedTheme);
		themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
	};

	const toggleTheme = () => {
		const currentTheme = document.documentElement.getAttribute('data-theme');
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', newTheme);
		localStorage.setItem('theme', newTheme);
		themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
	};

	// Mobile sidebar toggle
	const createOverlay = () => {
		if (document.querySelector('.sidebar-overlay')) return;
		const overlay = document.createElement('div');
		overlay.className = 'sidebar-overlay';
		overlay.addEventListener('click', closeSidebar);
		document.body.appendChild(overlay);
	};

	const openSidebar = () => {
		createOverlay();
		sidebar.classList.add('open');
		document.querySelector('.sidebar-overlay').classList.add('open');
		document.body.style.overflow = 'hidden';
	};

	const closeSidebar = () => {
		sidebar.classList.remove('open');
		const overlay = document.querySelector('.sidebar-overlay');
		if (overlay) {
			overlay.classList.remove('open');
			setTimeout(() => overlay.remove(), 300);
		}
		document.body.style.overflow = '';
	};

	toggleBtn.addEventListener('click', () => {
		if (window.innerWidth <= 1024) {
			if (sidebar.classList.contains('open')) {
				closeSidebar();
			} else {
				openSidebar();
			}
		} else {
			// Desktop toggle logic
			if (sidebar.style.display === 'none') {
				sidebar.style.display = 'block';
				app.style.gridTemplateColumns = '360px 1fr';
			} else {
				sidebar.style.display = 'none';
				app.style.gridTemplateColumns = '0 1fr';
			}
		}
	});

	themeToggle.addEventListener('click', toggleTheme);
	initTheme();

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
		maxClusterRadius: 40,
		disableClusteringAtZoom: 8,
		spiderfyOnMaxZoom: true,
		zoomToBoundsOnClick: false,
		animate: true,
		animateAddingMarkers: true
	});
	
	cluster.on('clusterclick', e => {
		const currentZoom = map.getZoom();
		const targetZoom = Math.min(currentZoom + 3, 10);
		
		// If we're close to max zoom or have few markers, spiderfy
		if (currentZoom >= 7 || e.layer.getChildCount() <= 3) {
			e.layer.spiderfy();
		} else {
			// Otherwise zoom in closer to the cluster
			map.setView(e.layer.getLatLng(), targetZoom, { animate: true });
		}
	});

	let currentMarkers = [];
	let userLocation = null;
	let markersLayer = L.layerGroup(); // For non-clustered markers

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
		const titleRaw = place.name.replace(/,.*/, '');
		const title = encodeURIComponent(titleRaw);
		const key = `wiki:${titleRaw.toLowerCase()}`;
		const now = Date.now();
		const ttl = 24 * 60 * 60 * 1000;
		try {
			const cached = JSON.parse(localStorage.getItem(key) || 'null');
			if (cached && now - cached.time < ttl) return Promise.resolve(cached.data);
		} catch(_) {}
		const wikiApi = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
		return fetch(wikiApi)
			.then(r => r.ok ? r.json() : null)
			.then(data => {
				if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
				const result = { url: data.content_urls?.desktop?.page, img: data.thumbnail?.source, desc: data.extract ? data.extract.slice(0, 180) + (data.extract.length > 180 ? '…' : '') : null };
				try { localStorage.setItem(key, JSON.stringify({ time: now, data: result })); } catch(_) {}
				return result;
			}).catch(() => null);
	}

	function computeCountryCounts(fromList = snowyPlaces) {
		if (!countriesLayer) return;
		countryCounts = {};
		const gj = countriesLayer.toGeoJSON();
		fromList.forEach(p => {
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
		
		const useCluster = clusteringToggle?.checked !== false;
		
		if (useCluster && map.hasLayer(cluster)) {
			cluster.zoomToShowLayer(item.marker, () => {
				map.setView(item.marker.getLatLng(), targetZoom, { animate: true });
				item.marker.openPopup();
			});
		} else {
			// Non-clustered mode or cluster not on map
			map.setView(item.marker.getLatLng(), targetZoom, { animate: true });
			item.marker.openPopup();
		}
	}

	function renderMarkers() {
		// Clear both layers safely
		if (map.hasLayer(cluster)) map.removeLayer(cluster);
		if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer);
		cluster.clearLayers();
		markersLayer.clearLayers();
		currentMarkers = [];
		
		const query = (searchInput.value || '').toLowerCase().trim();
		const allowed = new Set(regionCheckboxes.filter(cb => cb.checked).map(cb => cb.value));
		const icon = createSnowDivIcon();

		const bounds = map.getBounds();
		const useBounds = !!withinView?.checked;
		let filtered = snowyPlaces.filter(p => {
			if (!allowed.has(getRegion(p.lat, p.lng))) return false;
			if (query && !p.name.toLowerCase().includes(query)) return false;
			if (useBounds && !bounds.contains(L.latLng(p.lat, p.lng))) return false;
			return true;
		});
		
		if (userLocation) {
			filtered = filtered
				.map(p => ({ p, d: haversine([userLocation.lat, userLocation.lng], [p.lat, p.lng]) }))
				.sort((a,b) => a.d - b.d)
				.map(x => x.p);
		}

		const useCluster = clusteringToggle?.checked !== false;
		console.log(`Rendering ${filtered.length} markers, clustering: ${useCluster}`);
		console.log('Sample locations:', filtered.slice(0, 3).map(p => `${p.name}: [${p.lat}, ${p.lng}]`));

		filtered.forEach((p, index) => {
			console.log(`Creating marker ${index + 1}/${filtered.length}: ${p.name} at [${p.lat}, ${p.lng}]`);
			
			// Temporarily use default icons for debugging
			const m = L.marker([p.lat, p.lng], { pane: 'markers' });
			console.log(`Created marker with default icon for ${p.name}`);
			
			m.on('click', async () => {
				m.bindPopup('<em>Loading…</em>').openPopup();
				const extra = await enrichPopup(p);
				const html = extra ?
					`<div class="popup-media">${extra.img ? `<img src="${extra.img}" alt="${p.name}">` : ''}<div class="meta"><strong>${p.name}</strong><br/><small>${getRegion(p.lat,p.lng)}</small><br/>${extra.desc ? extra.desc : ''}<br/>${extra.url ? `<a href="${extra.url}" target="_blank" rel="noopener">Learn more ↗</a>` : ''}</div></div>` :
					`<strong>${p.name}</strong><br/><small>${getRegion(p.lat,p.lng)}</small>`;
				m.setPopupContent(html);
			});
			
			if (useCluster) {
				cluster.addLayer(m);
				console.log(`Added marker to cluster: ${p.name}`);
			} else {
				markersLayer.addLayer(m);
				console.log(`Added marker to regular layer: ${p.name}`);
			}
			currentMarkers.push({ place: p, marker: m });
		});

		// Add the appropriate layer to the map
		const targetLayer = useCluster ? cluster : markersLayer;
		map.addLayer(targetLayer);
		console.log(`Added ${useCluster ? 'cluster' : 'markers'} layer to map. Layer has ${targetLayer.getLayers ? targetLayer.getLayers().length : 'unknown'} items`);
		
		// Debug: Check if markers are within current map bounds
		const mapBounds = map.getBounds();
		console.log('Current map bounds:', mapBounds.toString());
		const visibleMarkers = filtered.filter(p => mapBounds.contains(L.latLng(p.lat, p.lng)));
		console.log(`${visibleMarkers.length}/${filtered.length} markers are within current map bounds`);
		
		// Debug: Try to force a simple test marker
		if (!useCluster) {
			console.log('Adding test marker at [0, 0] with default icon...');
			const testMarker = L.marker([0, 0]).addTo(map);
			testMarker.bindPopup('Test marker at [0,0]');
			setTimeout(() => {
				console.log('Removing test marker...');
				map.removeLayer(testMarker);
			}, 3000);
		}

		computeCountryCounts(filtered);
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
		if (resultsCountEl) resultsCountEl.textContent = String(list.length);
	}

	function renderSuggestions() {
		renderResults([...snowyPlaces].sort((a,b) => a.name.localeCompare(b.name)));
	}

	const debounce = (fn, ms = 250) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
	const updateUrlState = () => {
		const params = new URLSearchParams();
		const q = searchInput.value.trim();
		if (q) params.set('q', q);
		const activeRegions = regionCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
		params.set('regions', activeRegions.join(','));
		const c = map.getCenter();
		params.set('lat', c.lat.toFixed(4));
		params.set('lng', c.lng.toFixed(4));
		params.set('z', String(map.getZoom()));
		if (withinView?.checked) params.set('within', '1');
		history.replaceState(null, '', `?${params.toString()}`);
	};
	function applyUrlState() {
		const params = new URLSearchParams(location.search);
		const q = params.get('q') || '';
		searchInput.value = q;
		const regions = (params.get('regions') || '').split(',').filter(Boolean);
		if (regions.length) regionCheckboxes.forEach(cb => cb.checked = regions.includes(cb.value));
		const z = Number(params.get('z'));
		const lat = Number(params.get('lat'));
		const lng = Number(params.get('lng'));
		if (!Number.isNaN(z) && !Number.isNaN(lat) && !Number.isNaN(lng)) {
			map.setView([lat, lng], z);
		}
		if (withinView) withinView.checked = params.get('within') === '1';
	}

	applyUrlState();

	searchInput.addEventListener('input', renderMarkers);
	searchInput.addEventListener('input', debounce(updateUrlState, 200));
	regionCheckboxes.forEach(cb => cb.addEventListener('change', renderMarkers));
	regionCheckboxes.forEach(cb => cb.addEventListener('change', updateUrlState));
	if (withinView) withinView.addEventListener('change', () => { renderMarkers(); updateUrlState(); });
	if (clusteringToggle) clusteringToggle.addEventListener('change', renderMarkers);
	surpriseBtn.addEventListener('click', () => {
		const allowed = snowyPlaces.filter(p => {
			const region = getRegion(p.lat, p.lng);
			return regionCheckboxes.find(cb => cb.value === region)?.checked;
		});
		const pick = allowed[Math.floor(Math.random() * allowed.length)];
		if (!pick) return;
		focusMarkerByName(pick.name, 8);
	});
	if (clearBtn) clearBtn.addEventListener('click', () => { searchInput.value = ''; renderMarkers(); updateUrlState(); });
	if (resetBtn) resetBtn.addEventListener('click', () => {
		searchInput.value = '';
		if (withinView) withinView.checked = false;
		if (clusteringToggle) clusteringToggle.checked = true;
		regionCheckboxes.forEach(cb => cb.checked = true);
		userLocation = null;
		map.setView(initialCenter, initialZoom);
		renderMarkers();
		updateUrlState();
	});
	if (copyBtn) copyBtn.addEventListener('click', async () => {
		updateUrlState();
		try {
			await navigator.clipboard.writeText(window.location.href);
			const old = copyBtn.textContent;
			copyBtn.textContent = 'Copied!';
			setTimeout(() => { copyBtn.textContent = old; }, 900);
		} catch(_) {}
	});
	locateBtn.addEventListener('click', () => {
		if (!navigator.geolocation) return alert('Geolocation not supported on this browser.');
		navigator.geolocation.getCurrentPosition(pos => {
			userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			map.setView([userLocation.lat, userLocation.lng], 6);
			renderMarkers();
		}, () => alert('Could not get your location.'));
	});

	map.on('moveend zoomend', () => { if (withinView?.checked) { renderMarkers(); } updateUrlState(); });

	const title = L.control({ position: 'topright' });
	title.onAdd = function () {
		this._div = L.DomUtil.create('div', 'info');
		this._div.innerHTML = '<h4>Year‑Round Snow Locations</h4>';
		return this._div;
	};
	title.addTo(map);

	// Hide loading screen once everything is ready
	const hideLoading = () => {
		const loading = document.getElementById('loading');
		if (loading) {
			loading.style.opacity = '0';
			setTimeout(() => loading.remove(), 300);
		}
	};

	console.log('Snow places data loaded:', snowyPlaces.length, 'locations');
	console.log('First few locations:', snowyPlaces.slice(0, 3));
	
	renderMarkers();
	renderSuggestions();
	
	// Small delay to ensure everything is loaded
	setTimeout(hideLoading, 1000);
});
