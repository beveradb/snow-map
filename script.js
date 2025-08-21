document.addEventListener('DOMContentLoaded', () => {
	// Map init
	const map = L.map('map', {
		zoomControl: true,
	}).setView([20, 0], 2);

	// Colored basemap with subtle country colors
	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}).addTo(map);

	// UI elements
	const sidebar = document.getElementById('sidebar');
	const toggleBtn = document.getElementById('toggle');
	const searchInput = document.getElementById('search');
	const regionCheckboxes = Array.from(document.querySelectorAll('.region-filter'));
	const suggestionsList = document.getElementById('suggestions-list');

	toggleBtn.addEventListener('click', () => {
		if (sidebar.style.display === 'none' || getComputedStyle(sidebar).display === 'none') {
			sidebar.style.display = 'block';
			document.getElementById('app').style.gridTemplateColumns = '320px 1fr';
		} else {
			sidebar.style.display = 'none';
			document.getElementById('app').style.gridTemplateColumns = '0 1fr';
		}
	});

	// Helpers
	function createSnowDivIcon() {
		const svg = `
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="12" cy="12" r="6" fill="#f0f7ff"/>
				<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="#1e90ff" stroke-width="1.6" stroke-linecap="round"/>
			</svg>`;
		return L.divIcon({
			className: 'snow',
			html: svg,
			iconSize: [28, 28],
			iconAnchor: [14, 14],
			popupAnchor: [0, -16],
		});
	}

	function getRegion(lat, lng) {
		if (lat <= -60) return 'Antarctica';
		if (lat >= 7 && lng < -25) return 'North America';
		if (lat < 12 && lng >= -92 && lng <= -34) return 'South America';
		if (lat > 35 && lng >= -25 && lng <= 45) return 'Europe';
		if (lat < 38 && lat > -35 && lng >= -20 && lng <= 52) return 'Africa';
		if ((lat <= 0 && lng >= 110 && lng <= 180) || (lat < -25 && lng >= 145 && lng <= 180)) return 'Oceania';
		return 'Asia';
	}

	// Build markers layer with filtering
	const markersLayer = L.layerGroup().addTo(map);
	let currentMarkers = [];

	function renderMarkers() {
		markersLayer.clearLayers();
		currentMarkers = [];

		const query = (searchInput.value || '').trim().toLowerCase();
		const allowedRegions = new Set(regionCheckboxes.filter(cb => cb.checked).map(cb => cb.value));

		const filtered = snowyPlaces.filter(p => {
			const region = getRegion(p.lat, p.lng);
			const inRegion = allowedRegions.has(region);
			const inSearch = !query || p.name.toLowerCase().includes(query);
			return inRegion && inSearch;
		});

		const icon = createSnowDivIcon();
		filtered.forEach(place => {
			const marker = L.marker([place.lat, place.lng], { icon })
				.addTo(markersLayer)
				.bindPopup(`<strong>${place.name}</strong><br/><small>${getRegion(place.lat, place.lng)}</small>`);
			currentMarkers.push({ place, marker });
		});
	}

	// Suggestions list
	function renderSuggestions() {
		suggestionsList.innerHTML = '';
		const sample = [...snowyPlaces]
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 12);
		sample.forEach(p => {
			const li = document.createElement('li');
			li.textContent = p.name;
			li.className = 'suggestion-item';
			li.addEventListener('click', () => {
				map.setView([p.lat, p.lng], 6, { animate: true });
				const found = currentMarkers.find(m => m.place.name === p.name);
				if (found) found.marker.openPopup();
			});
			suggestionsList.appendChild(li);
		});
	}

	// Events
	searchInput.addEventListener('input', () => renderMarkers());
	regionCheckboxes.forEach(cb => cb.addEventListener('change', renderMarkers));

	// Title overlay
	const title = L.control({ position: 'topright' });
	title.onAdd = function () {
		this._div = L.DomUtil.create('div', 'info');
		this._div.innerHTML = '<h4>Year‑Round Snow Locations</h4>';
		return this._div;
	};
	title.addTo(map);

	// Initial paint
	renderMarkers();
	renderSuggestions();
});
