import 'dotenv/config';
import { createApp } from './api/app';

const PORT = Number(process.env['PORT'] ?? 3000);

const app = createApp();

app.listen(PORT, () => {
  console.log(`🌵 Raiz do Nordeste API rodando em http://localhost:${PORT}`);
  console.log(`📚 Swagger UI disponível em http://localhost:${PORT}/api/docs`);
});
