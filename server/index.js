import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import reissuanceRoutes from './routes/reissuance.js';
import cardsRoutes from './routes/cards.js';
import filesRoutes from './routes/files.js';
import 'dotenv/config';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use('/api/auth', authRoutes);                       //login/register
app.use('/api/applications', requireAuth, applicationRoutes);
app.use('/api/reissuance', requireAuth, reissuanceRoutes);
app.use('/api/cards', requireAuth, cardsRoutes);
app.use('/api/files', requireAuth, filesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
