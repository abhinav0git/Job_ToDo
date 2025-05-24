//server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const todoRoutes = require('./routes/todoRoutes');


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', todoRoutes);

app.get('/', (req, res) => {
  res.send('Express Server is running!');
});

module.exports = app;

//for local development
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/api`));

// app.listen('localhost:3000/api', () => {
//     console.log("heyyy")
// })