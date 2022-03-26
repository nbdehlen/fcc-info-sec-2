const { default: mongoose } = require("mongoose")
const Reply = require("./reply")

// TODO: Save array of reply ids instead
const thread = new mongoose.Schema({
  board: { type: String, required: true },
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: {
    type: Date,
    default: new Date(),
  },
  reported: { type: Boolean, default: false },
  replies: {
    type: [Reply],
    default: [],
  },
  bumped_on: {
    type: Date,
    default: new Date(),
  },
})

module.exports = mongoose.model("Thread", thread)
