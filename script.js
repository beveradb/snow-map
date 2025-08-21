document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const snowIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTkgMTN2Nmgydi02aC0yem0tNCAwTDQuNjQgNS42NGwxLjQyLTEuNDJMOC40OSA2LjY1bDEuNDEtMS40MWwyLjgyIDIuODMtMS40MSAxLjQxTDEyIDguNDlsMy41NCAzLjU0IDEuNDEtMS40MSAxLjQyIDEuNDJMMTMgMTN6bS0xLjc2LTcuODhsLjg5LS44OS44OS44OWMtMS43OC0xLjc5LTMuNTQtMy41NS02LjM3LTYuMzctLjUxLjUxLTEuMzMuNTEtMS44NCAwbC0xLjg1LTEuODUgNC4yNC00LjI0aDF6bTMuMjMgMTIuMDJjLTMuNDktMS4zOS02LjI4LTQuMTgtNy42Ny03LjY3bDQuMTItMS42NSA0LjI0IDQuMjQtLjcyLjcxek00IDlsMyAzdjJIODRWOXptMTMuMzYgMS42NGwtMS40MiAxLjQyIDEuNDIgMS40MSAyLjgzLTIuODMtMS40MS0xLjQxem0tNi4zNyA2LjM3bDEuNDEtMS40MiAxLjQyIDEuNDItMi44MyAyLjgyLTEuNDEtMS40MXoiLz48L3N2Zz4=',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    snowyPlaces.forEach(place => {
        L.marker([place.latitude, place.longitude], { icon: snowIcon })
            .addTo(map)
            .bindPopup(place.name);
    });
});
