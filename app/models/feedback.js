const mongoose = require('mongoose')
const Schema = mongoose.Schema

const feedSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    rating: { type: String, required: true }
}, { timestamps: true })

module.exports = mongoose.model('Feedback', feedSchema)