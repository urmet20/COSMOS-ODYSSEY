const API = {
  baseUrl: '',

  async getCurrentPricelist() {
    try {
      const response = await fetch(`${this.baseUrl}/api/pricelist/current`);
      if (!response.ok) {
        throw new Error('Failed to fetch current pricelist');
      }
      return await response.json();
    } catch (error) {
      console.error('Error in getCurrentPricelist:', error);
      throw error;
    }
  },

  async createReservation(reservationData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reservation');
      }
      return await response.json();
    } catch (error) {
      console.error('Error in createReservation:', error);
      throw error;
    }
  },

  async getReservations() {
    try {
      const response = await fetch(`${this.baseUrl}/api/reservations`);
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }
      return await response.json();
    } catch (error) {
      console.error('Error in getReservations:', error);
      throw error;
    }
  }
};
