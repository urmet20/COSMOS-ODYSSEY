const express = require('express');
const pricelistService = require('../services/pricelist');
const reservationModel = require('../models/reservation');

const router = express.Router();

router.get('/pricelist/current', async (req, res) => {
  try {
    const pricelist = await pricelistService.getCurrentPricelist();
    res.json(pricelist);
  } catch (error) {
    console.error('API Error in getCurrentPricelist:', error);
    res.status(500).json({ error: 'Failed to fetch pricelist' });
  }
});

router.post('/reservations', async (req, res) => {
  try {
    const reservationData = req.body;
    const reservation = await reservationModel.createReservation(reservationData);
    res.status(201).json(reservation);
  } catch (error) {
    console.error('API Error in createReservation:', error);
    res.status(400).json({ error: error.message || 'Failed to create reservation' });
  }
});

router.get('/reservations', async (req, res) => {
  try {
    const reservations = await reservationModel.getValidReservations();
    res.json(reservations);
  } catch (error) {
    console.error('API Error in getReservations:', error);
    res.status(500).json({ error: 'Failed to read reservations' });
  }
});

module.exports = router;
