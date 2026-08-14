import mongoose from 'mongoose'

let isMongoConnected = false

export async function connectMongoDB(retries = 5, delayMs = 3000) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chocodor'

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      })
      isMongoConnected = true
      console.log(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`)
      return conn
    } catch (err) {
      isMongoConnected = false
      if (attempt < retries) {
        console.log(`⏳ MongoDB: Connection attempt ${attempt}/${retries} failed (${err.message}). Retrying in ${delayMs / 1000}s...`)
        await new Promise((res) => setTimeout(res, delayMs))
      } else {
        console.log(`ℹ️  MongoDB: Could not connect to ${uri} after ${retries} attempts (${err.message}). Defaulting to built-in SQLite engine.`)
      }
    }
  }
}

export function getMongoStatus() {
  return isMongoConnected
}
