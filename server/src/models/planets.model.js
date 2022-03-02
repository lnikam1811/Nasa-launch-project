const fs = require("fs")
const path = require("path")
const { parse } = require("csv-parse")
const planets = require("./planets.mongo")

function isHabitablePlanets(planets) {
  return (
    planets["koi_disposition"] === "CONFIRMED" &&
    planets["koi_insol"] > 0.36 &&
    planets["koi_insol"] < 1.11 &&
    planets["koi_prad"] < 1.6
  )
}

function loadPlanetsData() {
  return new Promise((resolve, reject) => {
    fs.createReadStream(
      path.join(__dirname, "..", "..", "data", "kepler_data.csv")
    )
      .pipe(
        parse({
          comment: "#",
          columns: true,
        })
      )
      .on("data", async (data) => {
        if (isHabitablePlanets(data)) {
          savePlanets(data)
        }
      })
      .on("error", (err) => {
        console.log(err)
        reject(err)
      })
      .on("end", async () => {
        const countPlanetsFound = (await getAllPlanets()).length
        console.log(`${countPlanetsFound} habitable planets found!`)
        resolve()
      })
  })
}

async function getAllPlanets() {
  return await planets.find(
    {},
    {
      _id: 0,
      __v: 0,
    }
  )
}

async function savePlanets(planet) {
  try {
    return await planets.updateOne(
      {
        keplerName: planet.kepler_name,
      },
      {
        keplerName: planet.kepler_name,
      },
      { upsert: true }
    )
  } catch (error) {
    console.error(`Could not save planet ${error}`)
  }
}

module.exports = {
  loadPlanetsData,
  getAllPlanets,
}
