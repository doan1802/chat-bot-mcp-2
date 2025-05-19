const cluster = require('cluster');
const os = require('os');
const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length;

// Sử dụng cluster để tận dụng nhiều CPU
if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${numCPUs} worker processes...`);

  // Tạo worker cho mỗi CPU
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Xử lý khi worker bị crash
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code: ${code} and signal: ${signal}`);
    console.log('Starting a new worker...');
    cluster.fork();
  });
} else {
  // Worker processes share the same port
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} - API Gateway running on port ${PORT}`);
  });
}
