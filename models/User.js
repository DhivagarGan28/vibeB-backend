const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    first_name: { type: String, required: true, trim: true, maxlength: 100 },
    last_name: { type: String, required: true, trim: true, maxlength: 100 },

    name: { type: String, required: false, trim: true, maxlength: 100 },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },  

    dob: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 100 },
    avatar: { type: String },

    bio: { type: String, trim: true, maxlength: 300 },  
    address: { type: String, trim: true, maxlength: 200 },
    gender: { type: String, enum: ["male", "female", "other"], default: "other" },

    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
     friendRequests: {
        sent: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        received: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
