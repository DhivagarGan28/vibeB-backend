const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const mongoose = require("mongoose");
const upload = require("../middleware/upload");
const fs = require('fs')
const path = require('path')

const validateEmail = email => /\S+@\S+\.\S+/.test(email);

const router = express.Router();
router.post('/signup', async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email and password', status: "warning" });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Invalid email', status:"failed" });
        }
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already in use', status:"failed" });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const user = new User({ first_name, last_name, email, password: hashed });
        await user.save();

        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            status:'success',
            message: 'User created',
            token,
            user: { id: user._id, first_name: user.first_name, email: user.email, avatar: user.avatar }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Server error', status: "failed" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Provide email and password' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            status:"success",
            message: 'Login successful',
            token,
            user: { id: user._id, first_name: user.first_name, email: user.email, avatar: user.avatar }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.post("/send-friend-request", authMiddleware, async (req, res) => {
    try {
    const { receiverId, senderId } = req.body;
    if (senderId === receiverId) {
        return res.status(200).json({ message: "Cannot send request to yourself", status: "failed" });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
        return res.status(200).json({ message: "User not found" , status:"failed"});
    }

    // ✅ prevent duplicates
    if (
        receiver.friendRequests.received.includes(senderId) ||
        sender.friendRequests.sent.includes(receiverId)
    ) {
        return res.status(200).json({ message: "Request already sent", status: "warning" });
    }


    // ✅ save request
    sender.friendRequests.sent.push(receiverId);
    receiver.friendRequests.received.push(senderId);

    sender.save();
        receiver.save();

    // ✅ (Optional) Notification
    // socket.to(receiverId).emit(\"friend_request\", { from: senderId });

    res.json({ message: "Friend request sent", status: "success" });

    } catch (err) {
    res.status(500).json({ message: "Server error" });
    }
});

router.post("/accept-friend-request", authMiddleware, async (req, res) => {
    const { receiverId, senderId } = req.body;
    const rId = new mongoose.Types.ObjectId(receiverId);
    const sId = new mongoose.Types.ObjectId(senderId);

    await User.findByIdAndUpdate(rId, {
        $pull: { "friendRequests.received": sId },
        $addToSet    : { friends: sId },
            
        },
        { new: true }
    );

    await User.findByIdAndUpdate(sId, {
        $pull: { "friendRequests.sent": rId },
        $addToSet    : { friends: rId }
    },
    { new: true }
    );
    await User.findByIdAndUpdate(
        sId,
        { $pull: { "friendRequests.received": rId } },
        { new: true }
    );

    res.json({ message: "Friend request accepted", status:"success" });
});

router.post("/upload-avatar/:id", upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image uploaded" });
        }

        const imagePath = `/uploads/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { avatar: imagePath },
            { new: true }
        );

        res.json({
            message: "Image uploaded successfully",
            avatar: imagePath
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});


router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId)
            .populate("friends", "name email avatar bio") 
            .select("friends bio");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ friends: user.friends, bio: user.bio });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
})
router.put('/profileupdate/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const {name, first_name, last_name, email, phone, dob, gender, bio } = req.body;

        if (!first_name || !last_name || !email || !phone || !dob || !bio) {
            return res.status(400).json({ error: 'Missing Input values!' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name,
                first_name,
                last_name,
                email,
                phone,
                dob,
                gender,
                bio,
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
        status: 'success',
            message: 'User Profile Updated Successfully',
            user: {
                id: updatedUser._id,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                dob: updatedUser.dob,
                avatar: updatedUser.avatar
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/getdata/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'User data fetched successfully',
            user
        });

    } catch (err) {
        console.error(err);

        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid User ID' });
        }

        res.status(500).json({ error: 'Server error' });
    }
});
router.get("/getallUserdata/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const uId = new mongoose.Types.ObjectId(userId);

        const currentUser = await User.findById(uId).select("friends");

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const excludeIds = [uId, ...currentUser.friends];

        const allusers = await User.find({
            _id: { $nin: excludeIds }
        }).select("first_name last_name email avatar bio");

        const users = allusers.map(user => {
            let base64Image = null;

            if (user.avatar) {
                const imagePath = path.join(__dirname, '..', user.avatar);
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
                }
            }

            return {
                ...user.toObject(),
                avatar: base64Image
            };
        });

        return res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

router.post("/friend-requests", authMiddleware, async (req, res) => {
    const user = await User.findById(req.body.id)
    .populate("friendRequests.received", "name avatar");
    if(user.friendRequests.received.length > 0){
        res.json({status : "success", result: user.friendRequests.received});
    }else{
        res.json({status: "failed", message: "No Records Found!"})
    }
});

module.exports = router;
