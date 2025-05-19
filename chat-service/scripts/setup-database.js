const { spawn } = require('child_process');
const path = require('path');

// Danh sách các script cần chạy theo thứ tự
const scripts = [
  'create-tables.js',
  'update-chat-tables.sql',
  'check-database.js'
];

// Hàm chạy script
const runScript = (scriptPath) => {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Running ${scriptPath} ===\n`);
    
    const ext = path.extname(scriptPath);
    let process;
    
    if (ext === '.js') {
      // Chạy file JavaScript
      process = spawn('node', [path.join(__dirname, scriptPath)], {
        stdio: 'inherit'
      });
    } else if (ext === '.sql') {
      // Chạy file SQL thông qua run-migration.js
      process = spawn('node', [path.join(__dirname, 'run-migration.js')], {
        stdio: 'inherit',
        env: {
          ...process.env,
          MIGRATION_FILE: scriptPath
        }
      });
    } else {
      reject(new Error(`Unsupported file extension: ${ext}`));
      return;
    }
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`\n=== ${scriptPath} completed successfully ===\n`);
        resolve();
      } else {
        console.error(`\n=== ${scriptPath} failed with code ${code} ===\n`);
        reject(new Error(`Script ${scriptPath} failed with code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      console.error(`\n=== Error running ${scriptPath}: ${err.message} ===\n`);
      reject(err);
    });
  });
};

// Chạy các script theo thứ tự
const runScripts = async () => {
  try {
    for (const script of scripts) {
      await runScript(script);
    }
    
    console.log('\n=== All scripts completed successfully ===\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n=== Error: ${error.message} ===\n`);
    process.exit(1);
  }
};

// Chạy script
runScripts();
