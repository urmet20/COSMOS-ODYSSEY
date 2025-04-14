async function initApp() {
    try {
        UI.init();
  
        const pricelist = await API.getCurrentPricelist();
        UI.updatePricelistDisplay(pricelist);
  
        await UI.loadReservations();
  
    } catch (error) {
        console.error('FATAL: Error initializing app:', error);
        UI.showNotification(`Failed to initialize application: ${error.message || 'Unknown error'}. Please try refreshing the page.`, true);
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.innerHTML = `<section class="error-section"><h2>Application Error</h2><p>Could not load essential data. Please check your connection and refresh the page.</p><p><small>${Utils.escapeHtml(error.message)}</small></p></section>`;
        }
    }
  }
  
  
  document.addEventListener('DOMContentLoaded', initApp);
  
  setInterval(async () => {
    try {
        const latestPricelist = await API.getCurrentPricelist();
        const currentId = UI.getCurrentPricelistId();
  
        if (latestPricelist && latestPricelist.id !== currentId) {
            UI.updatePricelistDisplay(latestPricelist);
            UI.showNotification('Price list has been updated with new deals!');
            RouteUI.clearSearchResults();
        }
    } catch (error) {
        console.warn('Periodic pricelist check failed:', error.message);
    }
  }, 60000);
  