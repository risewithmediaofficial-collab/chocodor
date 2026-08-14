import mongoose from 'mongoose'

let isMongoConnected = false

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chocodor'

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    })
    isMongoConnected = true
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (err) {
    isMongoConnected = false
    console.log(`ℹ️  MongoDB: Not running locally on ${uri} (${err.message}). Defaulting to built-in SQLite engine.`)
  }
}

export function getMongoStatus() {
  return isMongoConnected
}
