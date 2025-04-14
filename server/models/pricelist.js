const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '../../data');
const PRICELISTS_FILE = path.join(DATA_DIR, 'pricelists.json');

class PricelistModel {
  constructor() {
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      try {
        await fs.access(PRICELISTS_FILE);
      } catch {
        await fs.writeFile(PRICELISTS_FILE, JSON.stringify([]));
      }
    } catch (err) {
      console.error('Error setting up data directory for pricelists:', err);
    }
  }

  async getPricelistsFromFile() {
    try {
      const data = await fs.readFile(PRICELISTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading pricelists:', error);
      return [];
    }
  }

  async getCurrentPricelist() {
    const pricelists = await this.getPricelistsFromFile();

    const now = new Date();
    const currentPricelist = pricelists.find(pl => new Date(pl.validUntil) > now);

    if (currentPricelist) {
      return currentPricelist;
    }

    try {
      const response = await axios.get('https://cosmosodyssey.azurewebsites.net/api/v1.0/TravelPrices');
      const newPricelist = response.data;

      pricelists.push(newPricelist);

      const updatedPricelists = pricelists.slice(-15);

      await this.savePricelists(updatedPricelists);

      return newPricelist;
    } catch (error) {
      console.error('Error fetching new pricelist:', error);
      throw new Error('Failed to fetch new pricelist');
    }
  }

  async savePricelists(pricelists) {
    try {
      await fs.writeFile(PRICELISTS_FILE, JSON.stringify(pricelists));
    } catch (error) {
      console.error('Error saving pricelists:', error);
      throw new Error('Failed to save pricelists');
    }
  }

  async isPricelistValid(pricelistId) {
    const pricelists = await this.getPricelistsFromFile();
    const pricelist = pricelists.find(pl => pl.id === pricelistId);

    if (!pricelist) {
      return false;
    }

    return new Date(pricelist.validUntil) > new Date();
  }

  async isPricelistStored(pricelistId) {
    const pricelists = await this.getPricelistsFromFile();
    return pricelists.some(pl => pl.id === pricelistId);
  }
}

module.exports = new PricelistModel();
