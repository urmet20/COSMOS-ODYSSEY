const AppState = {
    _state: {
        currentPricelist: null,
        planets: [],
        allFoundRoutes: [],
        filteredRoutes: [],
        selectedRoute: null,
        countdownInterval: null,
        currentPage: 1,
        routesPerPage: 5,
    },

    get(key) {
        return this._state[key];
    },

    set(key, value) {
        if (key in this._state) {
            this._state[key] = value;
        } else {
            console.warn(`Attempted to set unknown state property: ${key}`);
        }
    },

    resetRouteSearch() {
        this.set('allFoundRoutes', []);
        this.set('filteredRoutes', []);
        this.set('selectedRoute', null);
        this.set('currentPage', 1);
    },

    resetBooking() {
        this.set('selectedRoute', null);
    },

    clearCountdownInterval() {
        if (this.get('countdownInterval')) {
            clearInterval(this.get('countdownInterval'));
            this.set('countdownInterval', null);
        }
    },

    _getStateObject() {
        return this._state;
    }
};
