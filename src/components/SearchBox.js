import { API_ENDPOINTS } from '../config/constants.js';

export class SearchBox extends L.Control {
    constructor(options = {}) {
        super({ position: "topleft", ...options });
    }

    onAdd(map) {
        this.container = L.DomUtil.create("div", "search-container leaflet-control-foret");
        this._map = map;
        this._initLayout();
        this._bindEvents();
        return this.container;
    }

    _initLayout() {
        this.container.innerHTML = `
            <input type="text" id="searchInput" placeholder="Rechercher un lieu..." />
            <div id="autocompleteList" class="autocomplete-list"></div>
        `;
    }

    async _searchLocations(query) {
        const response = await fetch(`${API_ENDPOINTS.GEOCODING}?q=${encodeURIComponent(query)}&limit=5`);
        if (!response.ok) throw new Error('Search failed');
        return response.json();
    }

    _bindEvents() {
        const input = this.container.querySelector('#searchInput');
        const autocompleteList = this.container.querySelector('#autocompleteList');

        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (!query) {
                autocompleteList.innerHTML = '';
                return;
            }

            try {
                const data = await this._searchLocations(query);
                this._updateAutocompleteList(data, autocompleteList);
            } catch (error) {
                console.error('Search error:', error);
            }
        });

        L.DomEvent.disableClickPropagation(this.container);
    }
}
