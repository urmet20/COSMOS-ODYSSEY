const NotificationUI = {
    _notificationElement: null,
    _timeoutId: null,

    init() {
        this._notificationElement = DOM.getElement('notification');
        if (!this._notificationElement) {
            console.error("Notification element not found in DOM. Notifications will fallback to alerts.");
        }
    },

    show(message, isError = false) {
        const n = this._notificationElement;
        if (!n) {
            alert(`${isError ? 'Error: ' : ''}${message}`);
            return;
        }

        n.textContent = message;
        n.className = 'notification';

        void n.offsetWidth;

        n.classList.add('show');
        if (isError) {
            n.classList.add('error');
        }

        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }

        this._timeoutId = setTimeout(() => {
            n.classList.remove('show');
            this._timeoutId = null;
        }, 3500);
    }
};
