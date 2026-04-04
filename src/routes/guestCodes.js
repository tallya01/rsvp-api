const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const GuestCode = require('../db/models/GuestCode');

/**
 * GET /api/codes/:code
 * Fetch a guest code record by its 4-char code
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const guestCode = await GuestCode.findByPk(code.toUpperCase());

    if (!guestCode) {
      return res.status(404).json({ error: 'Code not found.' });
    }

    return res.json(guestCode);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/codes?page=1&limit=10
 * List all guest codes with pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await GuestCode.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'ASC']],
    });

    return res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
