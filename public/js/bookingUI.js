const BookingUI = {
    _elements: {},

    init(elements) {
        this._elements = elements;
        if (!this._elements.bookingSection || !this._elements.bookingForm || !this._elements.firstName || !this._elements.lastName || !this._elements.routeSummary) {
            console.error("BookingUI init failed: Required DOM elements missing.");
        }

        if (this._elements.firstName) {
            this._elements.firstName.addEventListener('input', this._validateNameInput);
        }

        if (this._elements.lastName) {
            this._elements.lastName.addEventListener('input', this._validateNameInput);
        }
    },

    _validateNameInput(event) {
        const input = event.target;
        const validatedValue = input.value.replace(/[^a-zA-Z\s\-']/g, '');

        if (validatedValue !== input.value) {
            input.value = validatedValue;
        }
    },

    selectRouteForBooking(route) {
        AppState.set('selectedRoute', route);
        if (this._elements.bookingSection) {
            this._elements.bookingSection.style.display = 'block';
            this._elements.bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this._updateRouteSummary();
    },

    _updateRouteSummary() {
        const routeSummaryElement = this._elements.routeSummary;
        if (!routeSummaryElement) return;

        const route = AppState.get('selectedRoute');
        if (!route) {
            routeSummaryElement.innerHTML = '';
            return;
        }

        let fullPathString = route.legs[0].from;
        route.legs.forEach(leg => {
            fullPathString += ` ➝ ${leg.to}`;
        });

        const overallStart = new Date(route.overallStartTime);
        const overallEnd = new Date(route.overallEndTime);

        const summaryHTML = `
            <div class="booking-summary">
                <h3 class="summary-title">🚀 Booking Summary</h3>
                <div class="summary-grid">
                    <div><strong>Route:</strong></div><div>${Utils.escapeHtml(fullPathString)} (${route.numberOfStops} stop${route.numberOfStops !== 1 ? 's' : ''})</div>
                    <div><strong>Overall Journey:</strong></div><div>${overallStart.toLocaleString()} ➝ ${overallEnd.toLocaleString()}</div>
                    <div><strong>Total Distance:</strong></div><div>${Utils.formatDistance(route.totalDistance)}</div>
                    <div><strong>Total Price:</strong></div><div>${Utils.formatPrice(route.totalPrice)}</div>
                    <div><strong>Total Flight Time:</strong></div><div>${Utils.formatTravelTime(route.totalTravelTime)}</div>
                    <div><strong>Companies:</strong></div><div>${Utils.escapeHtml(route.companies.join(', '))}</div>
                </div>
                <hr class="summary-divider">
                <div class="itinerary-details">
                    <h4>🧭 Itinerary Details</h4>
                    ${route.legs.map((leg, index) => {
                        const legStart = new Date(leg.provider.flightStart);
                        const legEnd = new Date(leg.provider.flightEnd);
                        return `
                            <div class="itinerary-leg">
                                <div class="leg-header">${index + 1}. ${Utils.escapeHtml(leg.from)} ➝ ${Utils.escapeHtml(leg.to)} <span class="company">(${Utils.escapeHtml(leg.provider.company.name)})</span></div>
                                <div class="leg-info">🕓 Depart: ${legStart.toLocaleString()}</div>
                                <div class="leg-info">🛬 Arrive: ${legEnd.toLocaleString()}</div>
                                <div class="leg-meta">📏 ${Utils.formatDistance(leg.distance)} | ⏱ ${Utils.formatTravelTime(leg.provider.travelTime)} | 💰 ${Utils.formatPrice(leg.provider.price)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        routeSummaryElement.innerHTML = summaryHTML;
    },

    async _checkForDuplicateReservation(firstName, lastName, selectedRoute) {
        try {
            const reservations = await API.getReservations();

            const duplicate = reservations.find(res => {
                const nameMatches = res.firstName.toLowerCase() === firstName.toLowerCase() &&
                                    res.lastName.toLowerCase() === lastName.toLowerCase();

                if (!nameMatches || !res.routes || res.routes.length === 0) return false;

                const sameRoute = res.routes[0].from === selectedRoute.legs[0].from &&
                                  res.routes[res.routes.length - 1].to === selectedRoute.legs[selectedRoute.legs.length - 1].to;

                const resDepartureTime = new Date(res.routes[0].flightStart).getTime();
                const selectedDepartureTime = new Date(selectedRoute.legs[0].provider.flightStart).getTime();
                const sameTime = resDepartureTime === selectedDepartureTime;

                return nameMatches && sameRoute && sameTime;
            });

            return duplicate;
        } catch (error) {
            console.error("Error checking for duplicate reservation:", error);
            return null;
        }
    },

    async handleBookingSubmit() {
        const selectedRoute = AppState.get('selectedRoute');
        const currentPricelist = AppState.get('currentPricelist');

        if (!selectedRoute || !currentPricelist) {
            NotificationUI.show('Cannot book: Missing selected route or pricelist info.', true);
            return;
        }

        const firstName = this._elements.firstName?.value.trim();
        const lastName = this._elements.lastName?.value.trim();

        if (!firstName || !lastName) {
            NotificationUI.show('Please enter both first and last name.', true);
            return;
        }

        if (!/^[a-zA-Z\s\-']+$/.test(firstName) || !/^[a-zA-Z\s\-']+$/.test(lastName)) {
            NotificationUI.show('Names can only contain letters, spaces, hyphens, and apostrophes.', true);
            return;
        }

        const duplicateReservation = await this._checkForDuplicateReservation(firstName, lastName, selectedRoute);
        if (duplicateReservation) {
            NotificationUI.show(`A reservation already exists for ${firstName} ${lastName} on this exact journey. Please select a different journey or use a different name.`, true);
            return;
        }

        const apiRoutes = selectedRoute.legs.map(leg => ({
            from: leg.from || null,
            to: leg.to || null,
            distance: leg.distance != null ? leg.distance : null,
            providerId: leg.provider?.id || null,
            company: leg.provider?.company?.name || null,
            price: leg.provider?.price != null ? leg.provider.price : null,
            flightStart: leg.provider?.flightStart || null,
            flightEnd: leg.provider?.flightEnd || null
        }));

        const reservationData = {
            firstName,
            lastName,
            priceListId: currentPricelist.id,
            routes: apiRoutes,
            totalPrice: selectedRoute.totalPrice,
            totalTime: selectedRoute.totalTravelTime,
            totalDistance: selectedRoute.totalDistance,
            companies: selectedRoute.companies
        };

        const submitButton = this._elements.bookingForm?.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        NotificationUI.show("Processing reservation...");

        try {
            const reservation = await API.createReservation(reservationData);
            NotificationUI.show('Reservation created successfully!');

            this._elements.bookingForm?.reset();
            AppState.resetBooking();
            if (this._elements.bookingSection) this._elements.bookingSection.style.display = 'none';
            if (this._elements.routeSummary) this._elements.routeSummary.innerHTML = '';

            await ReservationUI.loadAndDisplayReservations();
            this._elements.reservationsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error("Booking failed:", error);
            NotificationUI.show(`Booking failed: ${error.message || 'Please check details or try again later.'}`, true);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }
};
