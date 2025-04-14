const UI = {
    init() {

        const elements = DOM.getAllElements();

        NotificationUI.init();
        PricelistUI.init(elements);
        RouteUI.init(elements);
        BookingUI.init(elements);
        ReservationUI.init(elements);

        this.setupEventListeners(elements);
    },

    setupEventListeners(elements) {
        elements.searchForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const origin = elements.originSelect?.value;
            const destination = elements.destinationSelect?.value;

            if (!origin || !destination) {
                NotificationUI.show('Please select both origin and destination planets.', true);
                return;
            }
            if (origin === destination) {
                NotificationUI.show('Origin and destination cannot be the same.', true);
                return;
            }
            RouteUI.findAndDisplayRoutes(origin, destination);
        });

        elements.companyFilter?.addEventListener('change', () => RouteUI.filterAndDisplayRoutes());
        elements.sortBy?.addEventListener('change', () => RouteUI.filterAndDisplayRoutes());

        elements.bookingForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            BookingUI.handleBookingSubmit();
        });

        elements.routesContainer?.addEventListener('click', (e) => RouteUI.handleRouteContainerClick(e));

        elements.paginationControls?.addEventListener('click', (e) => RouteUI.handlePaginationClick(e));

        elements.paginationControls?.addEventListener('keydown', (e) => RouteUI.handlePaginationKeydown(e));

        elements.paginationControls?.addEventListener('input', (e) => RouteUI.handlePaginationInput(e));

        elements.reservationsContainer?.addEventListener('click', (e) => ReservationUI.handleReservationContainerClick(e));

    },

    updatePricelistDisplay(pricelist) {
        PricelistUI.updatePricelistInfo(pricelist);
    },

    loadReservations() {
        ReservationUI.loadAndDisplayReservations();
    },

    showNotification(message, isError = false) {
        NotificationUI.show(message, isError);
    },

     getCurrentPricelistId() {
        const pricelist = AppState.get('currentPricelist');
        return pricelist ? pricelist.id : null;
     }
};
