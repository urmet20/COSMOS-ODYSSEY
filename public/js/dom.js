const DOM = {
    selectors: {
        pricelistValidUntil: '#pricelist-valid-until',
        countdown: '#countdown',
        originSelect: '#origin',
        destinationSelect: '#destination',
        searchForm: '#search-form',
        filtersSection: '#filters-section',
        companyFilter: '#company-filter',
        sortBy: '#sort-by',
        resultsSection: '#results-section',
        routesContainer: '#routes-container',
        paginationControls: '#pagination-controls',
        bookingSection: '#booking-section',
        bookingForm: '#booking-form',
        firstName: '#first-name',
        lastName: '#last-name',
        routeSummary: '#route-summary',
        reservationsSection: '.reservations-section',
        reservationsContainer: '#reservations-container',
        notification: '#notification',
        pageInput: '#page-input',
    },

    elements: {},

    init() {
        for (const key in this.selectors) {
            try {
                this.elements[key] = document.querySelector(this.selectors[key]);
                if (!this.elements[key] && key !== 'pageInput') {
                    console.warn(`DOM element not found for selector: ${this.selectors[key]} (key: ${key})`);
                }
            } catch (error) {
                console.error(`Error selecting element for key ${key} with selector ${this.selectors[key]}:`, error);
            }
        }
    },

    getElement(key) {
        return this.elements[key] || null;
    },

    getAllElements() {
        return this.elements;
    }
};

DOM.init();
