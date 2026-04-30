require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

async function main() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/ethiocraft_global";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const User = require("../server/models/User");

    const artisan = await User.findOne({ role: "artisan" }).lean();
    if (!artisan) {
      console.error("No artisan user found in database");
      process.exit(1);
    }

    const payload = {
      userId: artisan._id.toString(),
      email: artisan.email,
      role: artisan.role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    });

    console.log("ARTISAN_ID=" + artisan._id.toString());
    console.log("TOKEN=" + token);
    process.exit(0);
  } catch (err) {
    console.error("Error generating token:", err);
    process.exit(1);
  }
}

main();
