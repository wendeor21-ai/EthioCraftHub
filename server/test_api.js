const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/ethiocraft'); 
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ role: 'artisan' });
  if (user) {
    console.log("Found an artisan:", user._id);
    console.log("Artisan Profile from MongoDB", user.profile);
    try {
      const resp = await axios.get(`http://localhost:5000/api/users/artisan/${user._id}`);
      console.log("API Response:", JSON.stringify(resp.data, null, 2));
    } catch (e) {
      console.error("API Error:");
      if(e.response) {
        console.error(JSON.stringify(e.response.data, null, 2));
      } else {
        console.error(e.message);
      }
    }
  } else {
    console.log("No artisan found");
  }
  process.exit(0);
}
test();
