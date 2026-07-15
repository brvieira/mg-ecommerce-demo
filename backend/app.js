import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { connectDb } = await import('./config/db.js');
const { default: productsRoutes } = await import('./routes/products.routes.js');
const { default: searchRoutes } = await import('./routes/search.routes.js');
const { default: filtersRoutes } = await import('./routes/filters.routes.js');
const { default: ordersRoutes } = await import('./routes/orders.routes.js');
const { startChangeLogService } = await import('./services/changeLogService.js');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/products', productsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/orders', ordersRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

connectDb()
  .then(() => {
    startChangeLogService();
    app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
