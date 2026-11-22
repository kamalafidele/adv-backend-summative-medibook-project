const express = require('express');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const config = require('./config');

const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(express.json()); // lets us read JSON request bodies

app.get('/health', function (req, res) {
  res.json({ status: 'ok' });
});

app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler); // must be the LAST app.use


app.listen(config.port, function () {
  console.log('MediBook API running on http://localhost:' + config.port);
});