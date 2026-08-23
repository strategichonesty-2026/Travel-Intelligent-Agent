require('dotenv').config({ quiet: true });

const { createApp } = require('./app');

const port = process.env.PORT || 3100;
const app = createApp();

app.listen(port, () => {
  console.log(`travel-intelligence-agent listening on port ${port}`);
});
