const express = require('express');
const router = express.Router();
const sequelize = require('../db/database');
const GuestCode = require('../db/models/GuestCode');
const Confirmation = require('../db/models/Confirmation');

/**
 * POST /api/confirmations
 * Insert one or more guests for a given code.
 * Body: { code, attending, guests: [{ full_name, is_child, age? }] }
 *
 * Rules:
 *  - code must exist and not have been confirmed yet
 *  - number of guests (including the primary) must not exceed max_companions + 1
 *  - sets confirmed=true and attending on the GuestCode row
 */
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { code, attending, guests } = req.body;

    if (!code || typeof attending !== 'boolean' || !Array.isArray(guests)) {
      await t.rollback();
      return res.status(400).json({
        error: 'Body must contain: code (string), attending (boolean).',
      });
    }

    const upperCode = code.toUpperCase();

    const guestCode = await GuestCode.findByPk(upperCode, { transaction: t, lock: true });
    if (!guestCode) {
      await t.rollback();
      return res.status(404).json({ error: 'Code not found.' });
    }

    if (guestCode.confirmed) {
      await t.rollback();
      return res.status(409).json({ error: 'This code has already been confirmed.' });
    }

    // max_companions + 1 (the primary guest)
    const maxAllowed = guestCode.max_companions + 1;
    if (guests.length > maxAllowed) {
      await t.rollback();
      return res.status(400).json({
        error: `This code allows at most ${maxAllowed} guest(s) (primary + ${guestCode.max_companions} companion(s)).`,
      });
    }

    // Validate each guest entry
    for (const [i, g] of guests.entries()) {
      if (!g.full_name || typeof g.full_name !== 'string' || g.full_name.trim() === '') {
        await t.rollback();
        return res.status(400).json({ error: `Guest at index ${i}: full_name is required.` });
      }
      if (typeof g.is_child !== 'boolean') {
        await t.rollback();
        return res.status(400).json({ error: `Guest at index ${i}: is_child (boolean) is required.` });
      }
      if (g.is_child && (g.age === null || g.age === undefined)) {
        await t.rollback();
        return res.status(400).json({ error: `Guest at index ${i}: age is required for children.` });
      }
      if (!g.is_child && g.age !== undefined && g.age !== null) {
        await t.rollback();
        return res.status(400).json({ error: `Guest at index ${i}: age should only be set for children.` });
      }
    }

    // Bulk-create confirmations
    const records = guests.map((g) => ({
      code: upperCode,
      full_name: g.full_name.trim(),
      is_child: g.is_child,
      age: g.is_child ? g.age : null,
    }));

    const created = await Confirmation.bulkCreate(records, { transaction: t, validate: true });

    // Mark code as confirmed
    await guestCode.update({ confirmed: true, attending }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      message: 'Confirmation registered successfully.',
      guestCode,
      guests: created,
    });
  } catch (err) {
    await t.rollback();
    console.error(err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/confirmations/:code
 * List all confirmed guests for a given code
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();

    const guestCode = await GuestCode.findByPk(upperCode);
    if (!guestCode) {
      return res.status(404).json({ error: 'Code not found.' });
    }

    const guests = await Confirmation.findAll({
      where: { code: upperCode },
      order: [['id', 'ASC']],
    });

    return res.json({ guestCode, guests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/confirmations/:id
 * Remove a single confirmation entry by its serial id
 */
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid id.' });
    }

    const confirmation = await Confirmation.findByPk(id, { transaction: t });
    if (!confirmation) {
      await t.rollback();
      return res.status(404).json({ error: 'Confirmation entry not found.' });
    }

    // Check if this was the last guest for the code — if so, revert the code's confirmed status
    const remaining = await Confirmation.count({
      where: { code: confirmation.code },
      transaction: t,
    });

    await confirmation.destroy({ transaction: t });

    if (remaining === 1) {
      // The entry we just deleted was the only one — revert confirmation
      await GuestCode.update(
        { confirmed: false, attending: null },
        { where: { code: confirmation.code }, transaction: t }
      );
    }

    await t.commit();
    return res.json({ message: 'Entry deleted successfully.' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/confirmations?page=1&limit=10
 * List all confirmations with pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await Confirmation.findAndCountAll({
      limit,
      offset,
      order: [['id', 'ASC']],
      include: [{ model: GuestCode, as: 'guestCode', attributes: ['first_name', 'confirmed', 'attending'] }],
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
