const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userRoutes = require('./src/routes/userRoutes');

app.use('/api', userRoutes);

app.listen(5000, () => console.log('Server running on port 5000'));

