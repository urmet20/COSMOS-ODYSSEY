const PricelistUI = {
    _elements: {},

    init(elements) {
        this._elements = elements;
        if (!this._elements.pricelistValidUntil || !this._elements.countdown || !this._elements.originSelect || !this._elements.destinationSelect) {
            console.error("PricelistUI init failed: Required DOM elements missing.");
        }
    },

    updatePricelistInfo(pricelist) {
        if (!pricelist || !pricelist.validUntil || !pricelist.legs || !Array.isArray(pricelist.legs)) {
            console.error("Invalid pricelist data received:", pricelist);
            NotificationUI.show("Error: Received invalid pricelist data.", true);
            if (this._elements.pricelistValidUntil) this._elements.pricelistValidUntil.textContent = 'N/A';
            this.clearCountdown('Pricelist Error');
            return;
        }

        AppState.set('currentPricelist', pricelist);
        const validUntil = new Date(pricelist.validUntil);

        if (this._elements.pricelistValidUntil) {
            this._elements.pricelistValidUntil.textContent = validUntil.toLocaleString();
        }

        this.startCountdown(validUntil);
        this._updatePlanetList(pricelist.legs);
    },

    clearCountdown(message = 'Expired!') {
        AppState.clearCountdownInterval();
        if (this._elements.countdown) {
            this._elements.countdown.textContent = message;
            this._elements.countdown.style.color = 'var(--error-color)';
        }
    },

    startCountdown(validUntil) {
        AppState.clearCountdownInterval();

        const intervalId = setInterval(() => {
            const now = new Date();
            const diff = validUntil.getTime() - now.getTime();

            if (diff <= 0) {
                this.clearCountdown('Expired!');
                NotificationUI.show('Pricelist expired. Reloading for new deals...', true);
                setTimeout(() => { location.reload(); }, 3000);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (this._elements.countdown) {
                this._elements.countdown.textContent = `Expires in: ${hours}h ${minutes}m ${seconds}s`;
                this._elements.countdown.style.color = diff < (1000 * 60 * 30)
                    ? 'var(--error-color)'
                    : 'var(--text-color)';
            }
        }, 1000);

        AppState.set('countdownInterval', intervalId);
    },

    _updatePlanetList(legs) {
        const planets = new Set();
        legs.forEach(leg => {
            if (leg?.routeInfo?.from?.name) {
                planets.add(leg.routeInfo.from.name);
            }
            if (leg?.routeInfo?.to?.name) {
                planets.add(leg.routeInfo.to.name);
            }
        });
        const sortedPlanets = [...planets].sort();
        AppState.set('planets', sortedPlanets);
        this._populatePlanetDropdowns(sortedPlanets);
    },

    _populatePlanetDropdowns(planets) {
        const { originSelect, destinationSelect } = this._elements;
        if (!originSelect || !destinationSelect) return;

        const currentOrigin = originSelect.value;
        const currentDestination = destinationSelect.value;

        originSelect.length = 1;
        destinationSelect.length = 1;

        planets.forEach(planet => {
            originSelect.appendChild(new Option(planet, planet));
            destinationSelect.appendChild(new Option(planet, planet));
        });

        if (planets.includes(currentOrigin)) {
            originSelect.value = currentOrigin;
        }
        if (planets.includes(currentDestination)) {
            destinationSelect.value = currentDestination;
        }
    },
};
