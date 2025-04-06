export class LayerControl extends L.Control {
    constructor(options = {}) {
        super({ position: "topleft", ...options });
    }

    onAdd(map) {
        this.container = L.DomUtil.create("div", "layer-control");
        this._map = map;
        this._initLayout();
        return this.container;
    }

    _initLayout() {
        this.container.innerHTML = `
            <div class="layer-toggles">
                <label class="toggle-switch">
                    <input type="checkbox" checked data-layer="forest">
                    <span class="toggle-slider"></span>
                    <span class="layer-icon forest"></span>BDForêt V2
                </label>
                <label class="toggle-switch">
                    <input type="checkbox" checked data-layer="hydro">
                    <span class="toggle-slider"></span>
                    <span class="layer-icon hydro"></span>Hydrographie
                </label>
                <label class="toggle-switch">
                    <input type="checkbox" data-layer="cadastre">
                    <span class="toggle-slider"></span>
                    <span class="layer-icon cadastre"></span>Cadastre
                </label>
            </div>
        `;

        this._bindEvents();
    }

    _bindEvents() {
        this.container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const layerName = e.target.dataset.layer;
                this._map.fire('layertoggle', { layer: layerName, active: e.target.checked });
            });
        });
    }
}
