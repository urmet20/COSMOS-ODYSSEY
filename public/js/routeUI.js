const RouteUI = {
    _elements: {},

    init(elements) {
        this._elements = elements;
        if (!this._elements.routesContainer || !this._elements.paginationControls || !this._elements.filtersSection || !this._elements.resultsSection || !this._elements.companyFilter || !this._elements.sortBy) {
            console.error("RouteUI init failed: Required DOM elements missing.");
        }
    },

    findAndDisplayRoutes(origin, destination) {
        const currentPricelist = AppState.get('currentPricelist');
        if (!currentPricelist) {
            NotificationUI.show('No active pricelist available. Cannot search.', true);
            return;
        }

        NotificationUI.show(`Searching routes from ${origin} to ${destination}...`);
        this._showLoadingState();
        AppState.resetRouteSearch();

        setTimeout(() => {
            try {
                const allRoutes = this._findAllRoutesBFS(origin, destination, currentPricelist.legs);
                AppState.set('allFoundRoutes', allRoutes);

                if (allRoutes.length === 0) {
                    NotificationUI.show('No routes found between the selected planets.', true);
                    if (this._elements.routesContainer) this._elements.routesContainer.innerHTML = '<p class="no-results-message">No routes found for this journey.</p>';
                    if (this._elements.paginationControls) this._elements.paginationControls.innerHTML = '';
                    if (this._elements.filtersSection) this._elements.filtersSection.style.display = 'none';
                    return;
                }

                this._updateCompanyFilterOptions(allRoutes);
                if (this._elements.filtersSection) this._elements.filtersSection.style.display = 'block';
                this.filterAndDisplayRoutes();
                NotificationUI.show(`Found ${allRoutes.length} possible route options.`);

            } catch (error) {
                console.error("Error during route finding or processing:", error);
                NotificationUI.show("An error occurred while searching for routes.", true);
                if (this._elements.routesContainer) this._elements.routesContainer.innerHTML = '<p class="error-message">Error searching for routes.</p>';
                if (this._elements.paginationControls) this._elements.paginationControls.innerHTML = '';
                if (this._elements.filtersSection) this._elements.filtersSection.style.display = 'none';
            }
        }, 50);
    },

    clearSearchResults() {
        if (this._elements.routesContainer) this._elements.routesContainer.innerHTML = '';
        if (this._elements.paginationControls) this._elements.paginationControls.innerHTML = '';
        if (this._elements.filtersSection) this._elements.filtersSection.style.display = 'none';
        if (this._elements.resultsSection) this._elements.resultsSection.style.display = 'none';
        if (this._elements.bookingSection) this._elements.bookingSection.style.display = 'none';
        AppState.resetRouteSearch();
        AppState.resetBooking();
    },

    _showLoadingState() {
        if (this._elements.routesContainer) this._elements.routesContainer.innerHTML = '<p class="loading-message">Searching for routes...</p>';
        if (this._elements.paginationControls) this._elements.paginationControls.innerHTML = '';
        if (this._elements.filtersSection) this._elements.filtersSection.style.display = 'none';
        if (this._elements.resultsSection) this._elements.resultsSection.style.display = 'block';
        if (this._elements.bookingSection) this._elements.bookingSection.style.display = 'none';
    },

    _findAllRoutesBFS(startPlanet, endPlanet, legsData) {
        if (!legsData || !Array.isArray(legsData)) {
             console.error("Cannot perform BFS: Pricelist legs data is missing or invalid.");
             return [];
        }

        const foundRoutes = [];
        const queue = [];
        const legsByOrigin = this._preprocessLegs(legsData);

        (legsByOrigin[startPlanet] || []).forEach(leg => {
            if (!leg?.routeInfo?.from?.name || !leg?.routeInfo?.to?.name || !Array.isArray(leg.providers)) {
                console.warn("Skipping invalid leg structure during BFS init:", leg);
                return;
            }

            leg.providers.forEach(provider => {
                if (!Utils.isValidProvider(provider)) {
                     console.warn("Skipping invalid initial provider:", provider, leg.routeInfo);
                     return;
                }
                const departureTime = new Date(provider.flightStart);
                const arrivalTime = new Date(provider.flightEnd);
                if (!Utils.isValidTimeRange(departureTime, arrivalTime)) {
                    console.warn("Skipping initial provider with invalid time range:", provider, leg.routeInfo);
                    return;
                }

                const initialPathLeg = {
                    legInfo: leg.routeInfo,
                    provider: { ...provider, travelTime: Utils.calculateTravelTime(provider.flightStart, provider.flightEnd) }
                };

                if (leg.routeInfo.to.name === endPlanet) {
                    const routeObject = this._createRouteObject([initialPathLeg]);
                    if (routeObject) foundRoutes.push(routeObject);
                } else {
                    queue.push({
                        pathLegs: [initialPathLeg],
                        currentPlanet: leg.routeInfo.to.name,
                        arrivalTime: arrivalTime,
                        visitedPlanets: new Set([startPlanet, leg.routeInfo.to.name])
                    });
                }
            });
        });

        let iterations = 0;
        const MAX_ITERATIONS = 50000;

        while (queue.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            const { pathLegs, currentPlanet, arrivalTime: previousArrivalTime, visitedPlanets } = queue.shift();

            (legsByOrigin[currentPlanet] || []).forEach(nextLeg => {
                if (!nextLeg?.routeInfo?.from?.name || !nextLeg?.routeInfo?.to?.name || !Array.isArray(nextLeg.providers)) {
                    console.warn("Skipping invalid leg structure during BFS loop:", nextLeg);
                    return;
                }
                const nextPlanet = nextLeg.routeInfo.to.name;

                if (visitedPlanets.has(nextPlanet)) return;

                nextLeg.providers.forEach(provider => {
                    if (!Utils.isValidProvider(provider)) return;

                    const nextDepartureTime = new Date(provider.flightStart);
                    const nextArrivalTime = new Date(provider.flightEnd);

                    if (!Utils.isValidTimeRange(nextDepartureTime, nextArrivalTime) ||
                        nextDepartureTime < previousArrivalTime) {
                        return;
                    }

                    const newPathLeg = {
                        legInfo: nextLeg.routeInfo,
                        provider: { ...provider, travelTime: Utils.calculateTravelTime(provider.flightStart, provider.flightEnd) }
                    };
                    const newPath = [...pathLegs, newPathLeg];

                    if (nextPlanet === endPlanet) {
                         const routeObject = this._createRouteObject(newPath);
                         if (routeObject) foundRoutes.push(routeObject);
                    } else {
                        const newVisitedPlanets = new Set(visitedPlanets);
                        newVisitedPlanets.add(nextPlanet);
                        queue.push({
                            pathLegs: newPath,
                            currentPlanet: nextPlanet,
                            arrivalTime: nextArrivalTime,
                            visitedPlanets: newVisitedPlanets
                        });
                    }
                });
            });
        }
         if (iterations >= MAX_ITERATIONS) {
             console.warn("BFS reached max iterations, potentially incomplete results.");
             NotificationUI.show("Search might be incomplete due to complexity. Results shown may not be exhaustive.", true);
         }

        return foundRoutes;
    },

    _preprocessLegs(legs) {
        const legsByOrigin = {};
        legs.forEach(leg => {
            if (!leg?.routeInfo?.from?.name || !leg?.routeInfo?.to?.name || !Array.isArray(leg.providers)) {
                return;
            }
            const originName = leg.routeInfo.from.name;
            if (!legsByOrigin[originName]) {
                legsByOrigin[originName] = [];
            }
            legsByOrigin[originName].push(leg);
        });
        return legsByOrigin;
    },

    _createRouteObject(pathLegs) {
        if (!pathLegs || pathLegs.length === 0) return null;

        let totalPrice = 0;
        let totalTravelTime = 0;
        let totalDistance = 0;
        const companies = new Set();
        const legs = [];

        for (const pathLeg of pathLegs) {
            if (!pathLeg?.legInfo || !pathLeg?.provider || pathLeg.provider.price == null || pathLeg.legInfo.distance == null || !pathLeg.provider.company?.name || pathLeg.provider.travelTime == null) {
                console.warn("Skipping route creation due to invalid leg data:", pathLeg, pathLegs);
                return null;
            }
            totalPrice += pathLeg.provider.price;
            totalTravelTime += pathLeg.provider.travelTime;
            totalDistance += pathLeg.legInfo.distance;
            companies.add(pathLeg.provider.company.name);
            legs.push({
                from: pathLeg.legInfo.from.name,
                to: pathLeg.legInfo.to.name,
                distance: pathLeg.legInfo.distance,
                provider: pathLeg.provider
            });
        }

        if (legs.length === 0 || !legs[0]?.provider?.flightStart || !legs[legs.length - 1]?.provider?.flightEnd) {
             console.warn("Skipping route creation due to missing start/end times or empty legs:", legs);
             return null;
        }


        return {
            legs: legs,
            totalPrice: totalPrice,
            totalTravelTime: totalTravelTime,
            totalDistance: totalDistance,
            numberOfStops: legs.length - 1,
            companies: [...companies],
            overallStartTime: legs[0].provider.flightStart,
            overallEndTime: legs[legs.length - 1].provider.flightEnd,
            id: legs.map(l => `${l.provider.id || 'no-id'}`).join('|')
        };
    },

    _updateCompanyFilterOptions(routes) {
        const companies = new Set();
        routes.forEach(route => {
            if (route.companies.length === 1) {
                 companies.add(route.companies[0]);
            }
        });

        const companyFilterElement = this._elements.companyFilter;
        if (!companyFilterElement) return;

        const currentValue = companyFilterElement.value;

        companyFilterElement.length = 1;

        [...companies].sort().forEach(company => {
            companyFilterElement.appendChild(new Option(company, company));
        });

        if ([...companies].includes(currentValue)) {
            companyFilterElement.value = currentValue;
        } else {
             companyFilterElement.value = "";
        }
    },

    filterAndDisplayRoutes() {
        const companyFilter = this._elements.companyFilter?.value;
        const sortBy = this._elements.sortBy?.value;
        const allFoundRoutes = AppState.get('allFoundRoutes');
        let filtered = [...allFoundRoutes];

        if (companyFilter) {
            filtered = filtered.filter(route =>
                route.companies.length === 1 && route.companies[0] === companyFilter
            );
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price': return a.totalPrice - b.totalPrice;
                case 'price-desc': return b.totalPrice - a.totalPrice;
                case 'distance': return a.totalDistance - b.totalDistance;
                case 'distance-desc': return b.totalDistance - a.totalDistance;
                case 'time': return a.totalTravelTime - b.totalTravelTime;
                case 'time-desc': return b.totalTravelTime - a.totalTravelTime;
                default: return 0;
            }
        });

        AppState.set('filteredRoutes', filtered);
        AppState.set('currentPage', 1);
        this._displayRoutesPage();
    },

    _displayRoutesPage() {
        const routesContainer = this._elements.routesContainer;
        if (!routesContainer) return;
        routesContainer.innerHTML = '';

        const currentPage = AppState.get('currentPage');
        const routesPerPage = AppState.get('routesPerPage');
        const filteredRoutes = AppState.get('filteredRoutes');

        if (filteredRoutes.length === 0) {
            routesContainer.innerHTML = '<p class="no-results-message">No routes found matching your criteria.</p>';
            this._displayPaginationControls();
            return;
        }

        const startIndex = (currentPage - 1) * routesPerPage;
        const endIndex = startIndex + routesPerPage;
        const paginatedRoutes = filteredRoutes.slice(startIndex, endIndex);

         if (paginatedRoutes.length === 0 && filteredRoutes.length > 0 && currentPage > 1) {
             console.warn(`Current page ${currentPage} is out of bounds after filtering. Resetting to page 1.`);
             AppState.set('currentPage', 1);
             this._displayRoutesPage();
             return;
         }

        paginatedRoutes.forEach((route) => {
            const routeCardElement = this._createRouteCardElement(route);
            if (routeCardElement) {
                routesContainer.appendChild(routeCardElement);
            } else {
                 console.warn("Failed to create route card element for route:", route);
            }
        });

        this._displayPaginationControls();
    },

    _displayPaginationControls() {
        const paginationControls = this._elements.paginationControls;
        if (!paginationControls) return;

        paginationControls.innerHTML = '';

        const currentPage = AppState.get('currentPage');
        const routesPerPage = AppState.get('routesPerPage');
        const filteredRoutes = AppState.get('filteredRoutes');
        const totalRoutes = filteredRoutes.length;
        const totalPages = Math.ceil(totalRoutes / routesPerPage);

        if (totalPages <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.className = 'btn';
        prevButton.disabled = currentPage === 1;
        prevButton.dataset.action = 'prev';
        paginationControls.appendChild(prevButton);

        const pageInfoContainer = document.createElement('span');
        pageInfoContainer.className = 'page-info';
        pageInfoContainer.innerHTML = `
            Page
            <input type="number" id="page-input" min="1" max="${totalPages}" value="${currentPage}" aria-label="Current page, input page number to go to">
            of ${totalPages}
        `;
        paginationControls.appendChild(pageInfoContainer);
        this._elements.pageInput = paginationControls.querySelector('#page-input');


        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.className = 'btn';
        nextButton.disabled = currentPage === totalPages;
        nextButton.dataset.action = 'next';
        paginationControls.appendChild(nextButton);
    },

    changePage(newPage) {
        const filteredRoutes = AppState.get('filteredRoutes');
        const routesPerPage = AppState.get('routesPerPage');
        const currentPage = AppState.get('currentPage');
        const totalPages = Math.ceil(filteredRoutes.length / routesPerPage);

        if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
            AppState.set('currentPage', newPage);
            this._displayRoutesPage();
            this._elements.resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (this._elements.pageInput) {
             this._elements.pageInput.value = currentPage;
        }
    },

    _createRouteCardElement(route) {
        if (!route || !route.legs || route.legs.length === 0 || !route.id) {
             console.error("Cannot create route card: Invalid route object provided.", route);
             return null;
        }

        const routeCard = Utils.createDiv('route-card');
        const isDirectFlight = route.numberOfStops === 0;
        const stops = route.numberOfStops;
        const stopText = isDirectFlight ? 'Direct Flight' : `${stops} stop${stops > 1 ? 's' : ''}`;
        let fullPathString = route.legs[0].from;
        route.legs.forEach(leg => { fullPathString += ` → ${leg.to}`; });

        const headerSection = Utils.createDiv('route-header', `
            <div class="route-main-info">
                <div class="route-planets">${Utils.escapeHtml(fullPathString)}</div>
                <div class="route-stops-badge ${isDirectFlight ? 'direct' : ''}">${stopText}</div>
            </div>
            <div class="route-price-container">
                <div class="route-price-label">Total Price</div>
                <div class="route-price">${Utils.formatPrice(route.totalPrice)}</div>
            </div>
        `);

        const summarySection = Utils.createDiv('route-summary', `
            ${Utils.createSummaryItem('🕒', 'Flight Time:', Utils.formatTravelTime(route.totalTravelTime))}
            ${Utils.createSummaryItem('📏', 'Distance:', Utils.formatDistance(route.totalDistance))}
            ${Utils.createSummaryItem('🏢', `Airline${route.companies.length > 1 ? 's' : ''}:`, Utils.escapeHtml(route.companies.join(', ')))}
        `);

        const journeySection = Utils.createJourneyTimelineElement(
            route.legs[0].from,
            route.legs[route.legs.length - 1].to,
            route.overallStartTime,
            route.overallEndTime,
            route.totalTravelTime,
            stopText
        );

        const selectButton = document.createElement('button');
        selectButton.className = 'btn select-route';
        selectButton.dataset.routeId = route.id;
        selectButton.textContent = 'Select This Itinerary';

        routeCard.appendChild(headerSection);
        routeCard.appendChild(summarySection);
        routeCard.appendChild(journeySection);

        if (!isDirectFlight) {
            const legToggleButton = document.createElement('button');
            legToggleButton.className = 'leg-toggle-btn';
            legToggleButton.innerHTML = `View Details <span class="toggle-icon">▼</span>`;

            const legsContainer = Utils.createDiv('legs-container collapsed');

            route.legs.forEach((leg, index) => {
                const legElement = this._createLegElement(leg);
                if (legElement) legsContainer.appendChild(legElement);

                if (index < route.legs.length - 1) {
                    const nextLeg = route.legs[index + 1];
                    const layoverElement = this._createLayoverElement(leg, nextLeg);
                    if (layoverElement) {
                        legsContainer.appendChild(layoverElement);
                    }
                }
            });

            routeCard.appendChild(legToggleButton);
            routeCard.appendChild(legsContainer);
        }

        routeCard.appendChild(selectButton);

        return routeCard;
    },

    _createLegElement(leg) {
        if (!leg || !leg.provider || !leg.from || !leg.to || !leg.provider.company || leg.distance == null || leg.provider.price == null || !leg.provider.flightStart || !leg.provider.flightEnd) {
             console.warn("Cannot create leg element: Incomplete leg data.", leg);
             return Utils.createDiv('leg-item error', 'Leg data incomplete');
        }
        const legStart = new Date(leg.provider.flightStart);
        const legEnd = new Date(leg.provider.flightEnd);
        const travelTime = Utils.calculateTravelTime(leg.provider.flightStart, leg.provider.flightEnd);

        if (!Utils.isValidTimeRange(legStart, legEnd)) {
             console.warn(`Invalid time range for leg ${Utils.escapeHtml(leg.from)} to ${Utils.escapeHtml(leg.to)}`);
             return Utils.createDiv('leg-item error', `Invalid time for leg ${Utils.escapeHtml(leg.from)} to ${Utils.escapeHtml(leg.to)}`);
        }

        const legItem = Utils.createDiv('leg-item');
        legItem.innerHTML = `
            <div class="leg-header">
                <div class="leg-path">
                    <div class="leg-from">${Utils.escapeHtml(leg.from)}</div>
                    <div class="leg-arrow">→</div>
                    <div class="leg-to">${Utils.escapeHtml(leg.to)}</div>
                </div>
                <div class="leg-company">${Utils.escapeHtml(leg.provider.company.name || leg.provider.company)}</div>
            </div>
            <div class="leg-details">
                <div class="leg-time-container">
                    ${Utils.createJourneyPoint(legStart, '', 'leg-time-block')}
                    <div class="leg-duration">
                        <div class="duration-line"></div>
                        <span class="duration-text">${Utils.formatTravelTime(travelTime)}</span>
                    </div>
                    ${Utils.createJourneyPoint(legEnd, '', 'leg-time-block')}
                </div>
                <div class="leg-info">
                    <div>Distance: ${Utils.formatDistance(leg.distance)}</div>
                    <div>Price: ${Utils.formatPrice(leg.provider.price)}</div>
                </div>
            </div>
        `;
        return legItem;
    },

    _createLayoverElement(previousLeg, currentLeg) {
        if (!previousLeg?.provider?.flightEnd || !currentLeg?.provider?.flightStart || !previousLeg?.to) return null;

        const prevEnd = new Date(previousLeg.provider.flightEnd);
        const currentStart = new Date(currentLeg.provider.flightStart);

        if (!Utils.isValidTimeRange(prevEnd, currentStart)) return null;

        const layoverMs = currentStart.getTime() - prevEnd.getTime();
        if (layoverMs <= 0) return null;

        return Utils.createDiv('layover-info', `
            <div class="layover-icon">⏱️</div>
            <div class="layover-details">
                <div class="layover-time">${Utils.formatTravelTime(layoverMs)}</div>
                <div class="layover-location">Layover in ${Utils.escapeHtml(previousLeg.to)}</div>
            </div>
        `);
    },

    handleRouteContainerClick(e) {
        const selectButton = e.target.closest('.select-route');
        const toggleButton = e.target.closest('.leg-toggle-btn');

        if (selectButton) {
            const routeId = selectButton.dataset.routeId;
            const filteredRoutes = AppState.get('filteredRoutes');
            const selected = filteredRoutes.find(r => r.id === routeId);
            if (selected) {
                BookingUI.selectRouteForBooking(selected);
            } else {
                 console.error("Could not find selected route by ID:", routeId);
                 NotificationUI.show("Error selecting route. Please try searching again.", true);
            }
        } else if (toggleButton) {
            this._toggleLegDetails(toggleButton);
        }
    },

    _toggleLegDetails(toggleButton) {
        const routeCard = toggleButton.closest('.route-card');
        const legsContainer = routeCard?.querySelector('.legs-container');
        const toggleIcon = toggleButton.querySelector('.toggle-icon');

        if (legsContainer) {
            legsContainer.classList.toggle('collapsed');
            const isCollapsed = legsContainer.classList.contains('collapsed');

            if (toggleIcon) toggleIcon.textContent = isCollapsed ? '▼' : '▲';
            toggleButton.innerHTML = isCollapsed
                ? `View Details <span class="toggle-icon">▼</span>`
                : `Hide Details <span class="toggle-icon">▲</span>`;
        }
    },

    handlePaginationClick(e) {
         if (e.target.tagName === 'BUTTON') {
            const action = e.target.dataset.action;
            const currentPage = AppState.get('currentPage');
            const filteredRoutes = AppState.get('filteredRoutes');
            const routesPerPage = AppState.get('routesPerPage');
            const totalPages = Math.ceil(filteredRoutes.length / routesPerPage);

            if (action === 'prev' && currentPage > 1) {
                this.changePage(currentPage - 1);
            } else if (action === 'next' && currentPage < totalPages) {
                 this.changePage(currentPage + 1);
            }
        }
    },

    handlePaginationKeydown(e) {
        const pageInputElement = this._elements.pageInput;
        if (pageInputElement && e.target === pageInputElement && e.key === 'Enter') {
           e.preventDefault();
           const filteredRoutes = AppState.get('filteredRoutes');
           const routesPerPage = AppState.get('routesPerPage');
           const totalPages = Math.ceil(filteredRoutes.length / routesPerPage);
           const enteredPage = parseInt(pageInputElement.value, 10);

           if (!isNaN(enteredPage) && enteredPage >= 1 && enteredPage <= totalPages) {
               this.changePage(enteredPage);
           } else {
               pageInputElement.value = AppState.get('currentPage').toString();
               NotificationUI.show(`Please enter a page number between 1 and ${totalPages}.`, true);
           }
       }
    },

     handlePaginationInput(e) {
        const pageInputElement = this._elements.pageInput;
        if (pageInputElement && e.target === pageInputElement) {
           e.target.value = e.target.value.replace(/[^0-9]/g, '');
       }
    }
};
