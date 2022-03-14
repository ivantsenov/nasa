const http = require('http');
require('dotenv').config();
const { mongoConnect } = require('./db');
const { loadPlanetsData } = require('./models/planets.model');
const { loadLaunchesData } = require('./models/launches.model');

const app = require('./app');

const server = http.createServer(app);

async function startServer() {
  await mongoConnect();
  await loadPlanetsData();
  await loadLaunchesData();

  server.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}.....`);
  });
}

startServer();
