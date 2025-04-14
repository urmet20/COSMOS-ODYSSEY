const ReservationUI = {
    _elements: {},

    init(elements) {
        this._elements = elements;
        if (!this._elements.reservationsContainer || !this._elements.reservationsSection) {
             console.error("ReservationUI init failed: Required DOM elements missing.");
        }
    },

    async loadAndDisplayReservations() {
        const container = this._elements.reservationsContainer;
        if (!container) return;

        container.innerHTML = '<p class="loading-message">Loading your reservations...</p>';

        try {
            const reservations = await API.getReservations();
            container.innerHTML = '';

            if (!reservations || reservations.length === 0) {
                container.innerHTML = '<p class="no-results-message">You currently have no reservations.</p>';
                return;
            }

            const reservationsList = Utils.createDiv('reservations-list');

            reservations.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                const timeA = !isNaN(dateA) ? dateA.getTime() : 0;
                const timeB = !isNaN(dateB) ? dateB.getTime() : 0;
                return timeB - timeA;
            });


            reservations.forEach(reservation => {
                const cardElement = this._createReservationCardElement(reservation);
                if (cardElement) {
                    reservationsList.appendChild(cardElement);
                } else {
                    console.warn("Failed to create reservation card for:", reservation);
                }
            });

            container.appendChild(reservationsList);

        } catch (error) {
            console.error('Error loading reservations:', error);
            if(container) container.innerHTML = '<p class="error-message">Could not load your reservations at this time.</p>';
            NotificationUI.show('Failed to load reservations. Please try again later.', true);
        }
    },

    _createReservationCardElement(reservation) {
         if (!reservation || !reservation.firstName || !reservation.lastName || !reservation.routes || !Array.isArray(reservation.routes)) {
             console.warn("Skipping reservation card due to missing or invalid data:", reservation);
             return null;
         }

         const card = Utils.createDiv('reservation-card');
         const routes = reservation.routes;
         const isMultiLeg = routes.length > 1;

         const header = Utils.createDiv('reservation-header', `
             <div class="header-left">
                 <div class="passenger-name">${Utils.escapeHtml(reservation.firstName)} ${Utils.escapeHtml(reservation.lastName)}</div>
                 <div class="booking-date">${reservation.createdAt ? `Booked on: ${new Date(reservation.createdAt).toLocaleDateString()}` : 'Booking date unavailable'}</div>
             </div>
             <div class="header-right">
                 <div class="reservation-price-container">
                     <div class="reservation-price-label">Total Price</div>
                     <div class="reservation-price">${Utils.formatPrice(reservation.totalPrice)}</div>
                 </div>
             </div>
         `);
         card.appendChild(header);

         const summary = Utils.createDiv('reservation-summary');
         if (reservation.totalTime != null) summary.innerHTML += Utils.createSummaryItem('🕒', 'Flight Time:', Utils.formatTravelTime(reservation.totalTime));
         if (reservation.totalDistance != null) summary.innerHTML += Utils.createSummaryItem('📏', 'Distance:', Utils.formatDistance(reservation.totalDistance));
         if (reservation.companies && reservation.companies.length > 0) summary.innerHTML += Utils.createSummaryItem('🏢', `Airline${reservation.companies.length > 1 ? 's' : ''}:`, Utils.escapeHtml(reservation.companies.join(', ')));
         card.appendChild(summary);

         let journeySection;
         if (routes.length > 0 && routes[0]?.from && routes[routes.length - 1]?.to && routes[0]?.flightStart && routes[routes.length - 1]?.flightEnd) {
             const stopText = isMultiLeg ? `${routes.length - 1} stop${routes.length - 1 !== 1 ? 's' : ''}` : 'Direct';
             journeySection = Utils.createJourneyTimelineElement(
                 routes[0].from,
                 routes[routes.length - 1].to,
                 routes[0].flightStart,
                 routes[routes.length - 1].flightEnd,
                 reservation.totalTime || 0,
                 stopText
             );
         } else {
             journeySection = Utils.createDiv('route-journey', '<p class="info-message">Overall journey details unavailable.</p>');
             console.warn('Could not create journey timeline for reservation:', reservation.id, 'Missing data in routes:', routes);
         }
         card.appendChild(journeySection);


          if (isMultiLeg) {
              const itineraryToggle = document.createElement('button');
              itineraryToggle.className = 'leg-toggle-btn';
              itineraryToggle.innerHTML = `View Itinerary Details <span class="toggle-icon">▼</span>`;

              const itineraryContainer = Utils.createDiv('itinerary-container collapsed');

              routes.forEach((routeLeg, index) => {
                  const adaptedLeg = {
                      ...routeLeg,
                       provider: {
                           id: routeLeg.providerId,
                           company: { name: routeLeg.company },
                           price: routeLeg.price,
                           flightStart: routeLeg.flightStart,
                           flightEnd: routeLeg.flightEnd,
                           travelTime: Utils.calculateTravelTime(routeLeg.flightStart, routeLeg.flightEnd)
                       }
                  };

                  const legElement = RouteUI._createLegElement(adaptedLeg);
                  if (legElement) itineraryContainer.appendChild(legElement);

                  if (index < routes.length - 1) {
                      const nextLeg = routes[index + 1];
                       const adaptedNextLeg = {
                           ...nextLeg,
                           provider: { flightStart: nextLeg.flightStart }
                       };
                      const layoverElement = RouteUI._createLayoverElement(adaptedLeg, adaptedNextLeg);
                      if (layoverElement) {
                          itineraryContainer.appendChild(layoverElement);
                      }
                  }
              });

              card.appendChild(itineraryToggle);
              card.appendChild(itineraryContainer);
          } else if (routes.length === 0) {
              const noDetails = document.createElement('p');
              noDetails.className = 'info-message';
              noDetails.textContent = 'Detailed itinerary information is unavailable for this booking.';
              noDetails.style.marginTop = '1em';
              card.appendChild(noDetails);
          }

         return card;
     },

     handleReservationContainerClick(e) {
         const toggleButton = e.target.closest('.leg-toggle-btn');
          if (toggleButton) {
              const resCard = toggleButton.closest('.reservation-card');
              const itineraryContainer = resCard?.querySelector('.itinerary-container');
              const toggleIcon = toggleButton.querySelector('.toggle-icon');

              if (itineraryContainer) {
                  itineraryContainer.classList.toggle('collapsed');
                  const isCollapsed = itineraryContainer.classList.contains('collapsed');
                  if (toggleIcon) toggleIcon.textContent = isCollapsed ? '▼' : '▲';
                  toggleButton.innerHTML = isCollapsed
                      ? `View Itinerary Details <span class="toggle-icon">▼</span>`
                      : `Hide Itinerary Details <span class="toggle-icon">▲</span>`;
              }
          }
     }
};
