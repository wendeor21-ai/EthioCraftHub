const axios = require('axios');
axios.post('http://localhost:5000/api/auth/test-email', { email: 'ethiocraftadmin@gmail.com' })
  .then(res => console.log('Response:', res.data))
  .catch(err => {
    console.error('Error:', err.message);
    if(err.response) console.error(err.response.data);
  });
