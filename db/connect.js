const { default: mongoose } = require("mongoose")

const connect = () => {
  try {
    mongoose.connect(
      `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PW}@${process.env.MONGODB_CLUSTER}?retryWrites=true&w=majority`
    )
  } catch (e) {
    console.warn(e)
  }
}

module.exports = { connect }
