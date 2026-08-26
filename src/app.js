const express = require('express');
const helmet = require('helmet');
const recommendationsRouter = require('./routes/recommendations');
const campgroundsRouter = require('./routes/campgrounds');
const scoringRouter = require('./routes/scoring');
const dashboardRouter = require('./routes/dashboard');
const profileRouter = require('./routes/profile');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/', dashboardRouter);
  app.use('/recommendations', recommendationsRouter);
  app.use('/campgrounds', campgroundsRouter);
  app.use('/scoring', scoringRouter);
  app.use('/api/profile', profileRouter);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
