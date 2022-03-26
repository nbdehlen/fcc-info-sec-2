const { default: mongoose } = require("mongoose")

const connect = async () => {
  try {
    await mongoose.connect(
      `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PW}@${process.env.MONGODB_CLUSTER}?retryWrites=true&w=majority`
    )
    return true
  } catch (e) {
    console.warn(e)
    return false
  }
}

module.exports = { connect }
