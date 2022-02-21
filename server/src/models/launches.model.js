require('dotenv').config();
const axios = require('axios');
const launches = require('./launches.mongo');
const planets = require('./planets.mongo');
const { getPagination } = require('../services/query');

const defaultFlightNumber = 100;

async function existLaunchWithId(launchId) {
  return await findLaunch({ flightNumber: launchId });
}

async function findLaunch(filter) {
  return await launches.findOne(filter);
}

async function populateLaunches() {
  console.log('Downloading launch data....');

  const response = await axios.post(
    `${process.env.SPACEX_API_URL}/launches/query`,
    {
      query: {},
      options: {
        pagination: false,
        populate: [
          {
            path: 'rocket',
            select: {
              name: 1,
            },
          },
          {
            path: 'payloads',
            select: {
              customers: 1,
            },
          },
        ],
      },
    }
  );

  if (response.status !== 200) {
    console.log('Problem downloading launch data');

    throw new Error('Launch data download failed');
  }

  const launchDocs = response.data.docs;

  for (const launchDoc of launchDocs) {
    const payloads = launchDoc.payloads;
    const customers = payloads.flatMap((payload) => {
      return payload.customers;
    });

    const launch = {
      flightNumber: launchDoc.flight_number,
      mission: launchDoc.name,
      rocket: launchDoc.rocket.name,
      launchDate: launchDoc.date_local,
      upcoming: launchDoc.upcoming,
      success: launchDoc.success,
      customers,
    };

    console.log(`${launch.flightNumber} ${launch.mission}`);

    await saveLaunch(launch);
  }
}

async function loadLaunchesData() {
  const firstLaunch = await findLaunch({
    flightNumber: 1,
    rocket: 'Falcon 1',
    mission: 'FalconSat',
  });

  if (firstLaunch) {
    console.log('Launch data already loaded');
  } else {
    await populateLaunches();
  }
}

async function getLatestFlightNumber() {
  // sort(-flightNumber) = sort(flightNumber, 'DESC')
  const latestLaunch = await launches.findOne().sort('-flightNumber');

  if (!latestLaunch) {
    return defaultFlightNumber;
  }

  return latestLaunch.flightNumber;
}

async function getAllLaunches() {
  const { skip, limit } = getPagination();
  return await launches
    .find({}, '-_id -__v')
    .sort({ flightNumber: 1 })
    .skip(skip)
    .limit(limit);
}

async function saveLaunch(launch) {
  await launches.findOneAndUpdate(
    { flightNumber: launch.flightNumber },
    launch,
    {
      upsert: true,
    }
  );
}

async function scheduleNewLaunch(launch) {
  const planet = await planets.findOne({ keplerName: launch.target });

  if (!planet) {
    throw new Error('No matching planet found');
  }

  const newFlightNumber = (await getLatestFlightNumber()) + 1;

  const newLaunch = Object.assign(launch, {
    success: true,
    upcoming: true,
    customers: ['ZTM', 'NASA'],
    flightNumber: newFlightNumber,
  });

  await saveLaunch(newLaunch);
}

async function abortLaunchById(launchId) {
  const aborted = await launches.updateOne(
    {
      flightNumber: launchId,
    },
    { upcoming: false, success: false }
  );

  return aborted.modifiedCount === 1;
}

module.exports = {
  existLaunchWithId,
  loadLaunchesData,
  getAllLaunches,
  scheduleNewLaunch,
  abortLaunchById,
};
