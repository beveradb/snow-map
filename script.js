document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    const snowIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMmwtMS40MSAxLjQxTDEyIDQuODNsMS40MS0xLjQxTDEyIDJ6bTAtMThsLTEuNDEgMS40MUwxMiAxOS4xN2wxLjQxLTEuNDFMMTIgMjJ6bTctM2wtMS40MS0xLjQxTDE1LjE3IDEybDEuNDIgMS40MUwxOSA5em0tMThsMS40MS0xLjQxTDIuODMgMTJsLTEuNDIgMS40MUwxIDl6bTMuNTQtOC40NmwxLjQxIDEuNDFMNi4zNiA1LjA1IDQuOTUgMy42NHptMTIuMDcgMGwxLjQxIDEuNDFMMTcuNjQgNS4wNWwtMS40MS0xLjQyem0wIDEyLjA3bC0xLjQxIDEuNDFMMTcuNjQgMTguOTVsMS40MS0xLjQyem0tMTIuMDcgMGwtMS40MSAxLjQxTDYuMzYgMTguOTVsMS40MS0xLjQyeiIvPjwvc3ZnPg==',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    snowyPlaces.forEach(place => {
        L.marker([place.lat, place.lng], { icon: snowIcon })
            .addTo(map)
            .bindPopup(place.name);
    });

    const title = L.control();
    title.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };
    title.update = function (props) {
        this._div.innerHTML = '<h4>Year-Round Snow Locations</h4>';
    };
    title.addTo(map);
});
