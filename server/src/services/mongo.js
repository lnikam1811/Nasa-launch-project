const mongoose = require("mongoose")

async function mongoConnect() {
  await mongoose.connect(process.env.MONGO_URI)
}
async function mongoDisconnect() {
  await mongoose.disconnect()
}

module.exports = { mongoConnect, mongoDisconnect }
