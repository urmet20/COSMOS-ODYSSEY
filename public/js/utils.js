const Utils = {

    formatPrice(price) {
        return `${price != null ? price.toLocaleString() : 'N/A'} Credits`;
    },

    formatDistance(distance) {
        return `${distance != null ? distance.toLocaleString() : 'N/A'} km`;
    },

    calculateTravelTime(start, end) {
        try {
            const s = new Date(start);
            const e = new Date(end);
            if (!this.isValidTimeRange(s, e)) return 0;
            return e.getTime() - s.getTime();
        } catch (e) {
            console.error("Error calculating travel time:", e);
            return 0;
        }
    },

    formatTravelTime(timeMs) {
        if (timeMs == null || timeMs < 0 || isNaN(timeMs)) return 'N/A';
        if (timeMs === 0) return '0m';

        const totalSeconds = Math.floor(timeMs / 1000);
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0 || (days === 0 && hours === 0)) result += `${minutes}m`;

        return result.trim() || '0m';
    },

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            return String(unsafe);
        }
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     },

     isValidTimeRange(start, end) {
        return start instanceof Date && !isNaN(start) &&
               end instanceof Date && !isNaN(end) &&
               end >= start;
     },

     isValidProvider(provider) {
        return provider &&
               provider.flightStart &&
               provider.flightEnd &&
               provider.price != null &&
               provider.company?.name;
     },

     createDiv(className = '', innerHTML = '') {
        const div = document.createElement('div');
        if (className) div.className = className;
        if (innerHTML) div.innerHTML = innerHTML;
        return div;
     },

     createSummaryItem(icon, label, value) {
        const valueSpan = document.createElement('span');
        valueSpan.className = 'summary-value';
        valueSpan.textContent = value;

        return `
            <div class="summary-item">
                <span class="summary-icon">${icon ? this.escapeHtml(icon) : ''}</span>
                <span class="summary-label">${this.escapeHtml(label)}</span>
                ${valueSpan.outerHTML}
            </div>
        `;
    },

    createJourneyTimelineElement(from, to, startTime, endTime, travelTimeMs, stopText) {
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (!this.isValidTimeRange(start, end)) {
             console.warn("Invalid start/end times for journey timeline:", startTime, endTime);
             return this.createDiv('route-journey', '<p class="info-message">Overall journey times unavailable.</p>');
        }

        return this.createDiv('route-journey', `
            <div class="journey-timeline">
                ${this.createJourneyPoint(start, from, 'journey-start')}
                <div class="journey-duration">
                    <div class="duration-line"></div>
                    <div class="duration-label">
                        <span class="journey-time">${this.formatTravelTime(travelTimeMs)}</span>
                        <span class="journey-stops">${this.escapeHtml(stopText)}</span>
                    </div>
                </div>
                ${this.createJourneyPoint(end, to, 'journey-end')}
            </div>
        `);
    },

    createJourneyPoint(dateTime, location, className) {
        const timeStr = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = dateTime.toLocaleDateString();

        return `
            <div class="${className}">
                <div class="time">${timeStr}</div>
                <div class="date">${dateStr}</div>
                <div class="location">${this.escapeHtml(location)}</div>
            </div>
        `;
    },
};
