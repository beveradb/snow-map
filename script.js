document.addEventListener('DOMContentLoaded', () => {
	// Map init
	const map = L.map('map', { zoomControl: true }).setView([20, 0], 2);

	// Colored basemap
	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}).addTo(map);

	// UI refs
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

	// Regions helper
	function getRegion(lat, lng) {
		if (lat <= -60) return 'Antarctica';
		if (lat >= 7 && lng < -25) return 'North America';
		if (lat < 12 && lng >= -92 && lng <= -34) return 'South America';
		if (lat > 35 && lng >= -25 && lng <= 45) return 'Europe';
		if (lat < 38 && lat > -35 && lng >= -20 && lng <= 52) return 'Africa';
		if ((lat <= 0 && lng >= 110 && lng <= 180) || (lat < -25 && lng >= 145 && lng <= 180)) return 'Oceania';
		return 'Asia';
	}

	// Country coloring via TopoJSON (light pastel fill on hover)
	fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
		.then(r => r.json())
		.then(topology => {
			const geojson = topojson.feature(topology, topology.objects.countries);
			function style() {
				return {
					color: '#cfd8dc',
					weight: 1,
					fillColor: '#f3f7fa',
					fillOpacity: 0.8,
					opacity: 1
				};
			}
			function hover(e) {
				const layer = e.target;
				layer.setStyle({ fillColor: '#e2f1ff' });
			}
			function reset(e) {
				countries.resetStyle(e.target);
			}
			const countries = L.geoJSON(geojson, { style, onEachFeature: (f, l) => {
				l.on({ mouseover: hover, mouseout: reset });
			}}).addTo(map);
		});

	// DivIcon snowflake
	function createSnowDivIcon() {
		const svg = `
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="12" cy="12" r="6" fill="#f0f7ff"/>
				<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="#1e90ff" stroke-width="1.6" stroke-linecap="round"/>
			</svg>`;
		return L.divIcon({ className: 'snow', html: svg, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] });
	}

	// Clustering layer
	const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
	map.addLayer(cluster);
	let currentMarkers = [];

	function renderMarkers() {
		cluster.clearLayers();
		currentMarkers = [];
		const query = (searchInput.value || '').toLowerCase().trim();
		const allowed = new Set(regionCheckboxes.filter(cb => cb.checked).map(cb => cb.value));
		const icon = createSnowDivIcon();
		snowyPlaces
			.filter(p => allowed.has(getRegion(p.lat, p.lng)) && (!query || p.name.toLowerCase().includes(query)))
			.forEach(p => {
				const m = L.marker([p.lat, p.lng], { icon }).bindPopup(`<strong>${p.name}</strong><br/><small>${getRegion(p.lat, p.lng)}</small>`);
				cluster.addLayer(m);
				currentMarkers.push({ place: p, marker: m });
			});
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

	// Events
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

	// Title overlay
	const title = L.control({ position: 'topright' });
	title.onAdd = function () {
		this._div = L.DomUtil.create('div', 'info');
		this._div.innerHTML = '<h4>Year‑Round Snow Locations</h4>';
		return this._div;
	};
	title.addTo(map);

	// Initial render
	renderMarkers();
	renderSuggestions();
});
