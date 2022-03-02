const launchesDb = require("./launches.mongo")
const planets = require("./planets.mongo")
const axios = require("axios")

const DEFAULT_FLIGHT_NUMBER = 100

const SPACEX_API_URL = "https://api.spacexdata.com/v4/launches/query"

async function populateLaunches() {
  console.log("Downloading launch data...")
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      pagination: false,
      populate: [
        {
          path: "rocket",
          select: {
            name: 1,
          },
        },
        {
          path: "payloads",
          select: {
            customers: 1,
          },
        },
      ],
    },
  })

  if (response.status !== 200) {
    console.log("Problem downloading launch data")
    throw new Error("Launch data download failed!")
  }

  const launchDocs = response.data.docs
  for (const launchDoc of launchDocs) {
    const payloads = launchDoc["payloads"]
    const customers = payloads.flatMap((payload) => {
      return payload["customers"]
    })
    const launch = {
      flightNumber: launchDoc["flight_number"],
      rocket: launchDoc["rocket"]["name"],
      mission: launchDoc["name"],
      launchDate: launchDoc["date_local"],
      upcoming: launchDoc["upcoming"],
      success: launchDoc["success"],
      customers,
    }

    console.log(`${launch.flightNumber} ${launch.mission}`)

    await saveLaunch(launch)
  }
}

async function loadLaunchData() {
  const firstLaunch = await findLaunch({
    flightNumber: 1,
    mission: "FalconSat",
    rocket: "Falcon 1",
  })

  if (firstLaunch) {
    console.log("Data was already loaded")
  } else {
    populateLaunches()
  }
}

async function findLaunch(filter) {
  return await launchesDb.findOne(filter)
}

async function existsLaunchWithId(launchId) {
  const launchFound = await launchesDb.find({
    flightNumber: launchId,
  })

  console.log(launchFound)

  return launchFound
}

async function getLatestFlightNumber() {
  const latestLaunch = await launchesDb.findOne().sort("-flightNumber")

  if (!latestLaunch) {
    return DEFAULT_FLIGHT_NUMBER
  }
  return latestLaunch.flightNumber
}

async function getAllLaunches(skip, limit) {
  return await launchesDb
    .find({}, { _id: 0, __v: 0 })
    .sort({ flightNumber: 1 })
    .skip(skip)
    .limit(limit)
}

async function saveLaunch(launch) {
  await launchesDb.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    {
      upsert: true,
    }
  )
}

async function scheduleNewLaunch(launch) {
  const planet = await planets.findOne({ keplerName: launch.target })

  if (!planet) {
    throw new Error("No matching planet found")
  }
  const newFlightNumber = (await getLatestFlightNumber()) + 1

  const newLaunch = Object.assign(launch, {
    success: true,
    upcoming: true,
    customers: ["Zero to mastery", "NASA"],
    flightNumber: newFlightNumber,
  })

  await saveLaunch(newLaunch)
}

async function abortLaunchById(launchId) {
  const aborted = await launchesDb.updateOne(
    {
      flightNumber: launchId,
    },
    { upcoming: false, success: false }
  )
  console.log(aborted)

  return aborted.ok === 1 && aborted.nModified === 1
}

module.exports = {
  loadLaunchData,
  getAllLaunches,
  scheduleNewLaunch,
  existsLaunchWithId,
  abortLaunchById,
}
