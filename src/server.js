require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./db/database');

// Import models to register associations before sync
require('./db/models/GuestCode');
require('./db/models/Confirmation');

// Import routes
const guestCodesRouter = require('./routes/guestCodes');
const confirmationsRouter = require('./routes/confirmations');

const app = express();
app.use(cors());
app.use(express.json());

// ----- Routes -----
app.get('/', (req, res) => res.json({ message: 'Wedding RSVP API 🎉' }));

app.use('/api/codes', guestCodesRouter);
app.use('/api/confirmations', confirmationsRouter);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected error.' });
});

// ----- Boot -----
const PORT = process.env.PORT || 3000;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced.');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  });
