const { default: mongoose } = require("mongoose")

const reply = new mongoose.Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  reported: { type: Boolean, default: false },
  thread_id: mongoose.Types.ObjectId,
})

module.exports = reply
