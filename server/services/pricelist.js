const pricelistModel = require('../models/pricelist');

class PricelistService {
  async getCurrentPricelist() {
    try {
      return await pricelistModel.getCurrentPricelist();
    } catch (error) {
      console.error('Error in pricelist service:', error);
      throw new Error('Failed to get current pricelist');
    }
  }
}

module.exports = new PricelistService();
