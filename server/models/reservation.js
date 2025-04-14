const fs = require('fs').promises;
const path = require('path');
const pricelistModel = require('./pricelist');

const DATA_DIR = path.join(__dirname, '../../data');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');

class ReservationModel {
  constructor() {
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      try {
        await fs.access(RESERVATIONS_FILE);
      } catch {
        await fs.writeFile(RESERVATIONS_FILE, JSON.stringify([]));
      }
    } catch (err) {
      console.error('Error setting up data directory for reservations:', err);
    }
  }

  async getReservationsFromFile() {
    try {
      const data = await fs.readFile(RESERVATIONS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading reservations:', error);
      return [];
    }
  }

  async createReservation(reservationData) {
    const required = ['firstName', 'lastName', 'priceListId', 'routes', 'totalPrice', 'totalTime', 'companies'];
    for (const field of required) {
      if (!reservationData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const isPricelistValid = await pricelistModel.isPricelistValid(reservationData.priceListId);
    if (!isPricelistValid) {
      throw new Error('Pricelist has expired or is invalid');
    }

    const isPricelistStored = await pricelistModel.isPricelistStored(reservationData.priceListId);
    if (!isPricelistStored) {
      throw new Error('Pricelist not found in storage');
    }

    const reservation = {
      ...reservationData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    const reservations = await this.getReservationsFromFile();
    reservations.push(reservation);

    try {
      await fs.writeFile(RESERVATIONS_FILE, JSON.stringify(reservations));
      return reservation;
    } catch (error) {
      console.error('Error saving reservation:', error);
      throw new Error('Failed to save reservation');
    }
  }

  async getValidReservations() {
    const reservations = await this.getReservationsFromFile();

    const validReservations = [];

    for (const reservation of reservations) {
      const isPricelistStored = await pricelistModel.isPricelistStored(reservation.priceListId);
      if (isPricelistStored) {
        validReservations.push(reservation);
      }
    }

    return validReservations;
  }
}

module.exports = new ReservationModel();
