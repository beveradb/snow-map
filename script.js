document.addEventListener('DOMContentLoaded', () => {
	const map = L.map('map', { zoomControl: true }).setView([20, 0], 2);
	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}).addTo(map);

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
			const id = layer.feature.id; // numeric id
			const count = countryCounts[id] || 0;
			layer.setStyle({ fillColor: getColorForCount(count) });
		});
	}

	function buildLegend() {
		const legend = L.control({ position: 'bottomright' });
		legend.onAdd = function () {
			const div = L.DomUtil.create('div', 'leaflet-control legend');
			div.innerHTML = '<strong>Snowy spots</strong><br>' +
				colorScale.map((s, i) => {
					const from = i === 0 ? 0 : colorScale[i-1].max + 1;
					const to = s.max === Infinity ? '10+' : s.max;
					return `<span class="swatch" style="background:${s.color}"></span>${from}–${to}`;
				}).join('<br>');
			return div;
		};
		legend.addTo(map);
	}

	fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
		.then(r => r.json())
		.then(topology => {
			const geojson = topojson.feature(topology, topology.objects.countries);
			countriesLayer = L.geoJSON(geojson, {
				style: () => ({ color: '#cfd8dc', weight: 1, fillColor: '#f3f7fa', fillOpacity: 0.85, opacity: 1 }),
				onEachFeature: (f, l) => {
					l.on({ mouseover: e => e.target.setStyle({ fillColor: '#e2f1ff' }), mouseout: () => updateChoropleth() });
				}
			}).addTo(map);
			buildLegend();
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

	const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
	map.addLayer(cluster);
	let currentMarkers = [];

	function enrichPopup(place) {
		const title = encodeURIComponent(place.name.replace(/,.*/,''));
		const wikiApi = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
		return fetch(wikiApi)
			.then(r => r.ok ? r.json() : null)
			.then(data => {
				if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
				return {
					url: data.content_urls?.desktop?.page,
					img: data.thumbnail?.source,
					desc: data.extract ? data.extract.slice(0, 180) + (data.extract.length > 180 ? '…' : '') : null
				};
			}).catch(() => null);
	}

	function renderMarkers() {
		cluster.clearLayers();
		currentMarkers = [];
		const query = (searchInput.value || '').toLowerCase().trim();
		const allowed = new Set(regionCheckboxes.filter(cb => cb.checked).map(cb => cb.value));
		const icon = createSnowDivIcon();

		// reset counts
		countryCounts = {};

		snowyPlaces
			.filter(p => allowed.has(getRegion(p.lat, p.lng)) && (!query || p.name.toLowerCase().includes(query)))
			.forEach(p => {
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

				// country counting using turf
				// We'll approximate by matching to countries layer bounding boxes once available
			});

		// If countriesLayer already loaded, compute counts precisely via turf
		if (countriesLayer) {
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
					} catch(_) { /* ignore */ }
				}
			});
			updateChoropleth();
		}
	}

	function renderSuggestions() {
		suggestionsList.innerHTML = '';
		[...snowyPlaces].sort((a,b) => a.name.localeCompare(b.name)).slice(0, 14).forEach(p => {
			const li = document.createElement('li');
			li.textContent = p.name;
			li.className = 'suggestion-item';
			li.addEventListener('click', () => {
				map.setView([p.lat, p.lng], 6);
				const found = currentMarkers.find(x => x.place.name === p.name);
				if (found) found.marker.openPopup();
			});
			suggestionsList.appendChild(li);
		});
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
		map.setView([pick.lat, pick.lng], 6, { animate: true });
		const found = currentMarkers.find(x => x.place.name === pick.name);
		if (found) found.marker.openPopup();
	});
	locateBtn.addEventListener('click', () => {
		if (!navigator.geolocation) return alert('Geolocation not supported on this browser.');
		navigator.geolocation.getCurrentPosition(pos => {
			const { latitude, longitude } = pos.coords;
			map.setView([latitude, longitude], 5);
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
