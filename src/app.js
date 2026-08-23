const express = require('express');
const helmet = require('helmet');
const recommendationsRouter = require('./routes/recommendations');
const campgroundsRouter = require('./routes/campgrounds');
const scoringRouter = require('./routes/scoring');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/recommendations', recommendationsRouter);
  app.use('/campgrounds', campgroundsRouter);
  app.use('/scoring', scoringRouter);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
