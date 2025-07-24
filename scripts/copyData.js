import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../data/sample-space');
const targetDir = path.join(__dirname, '../public/data');

// 确保目标目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// 复制文件
function copyFile(source, target) {
  try {
    fs.copyFileSync(source, target);
    console.log(`Copied: ${path.basename(source)}`);
  } catch (error) {
    console.error(`Error copying ${source}:`, error.message);
  }
}

// 复制目录
function copyDirectory(source, target) {
  ensureDirectoryExists(target);
  
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      copyFile(sourcePath, targetPath);
    }
  }
}

// 主函数
function main() {
  console.log('Starting data copy process...');
  console.log(`Source: ${sourceDir}`);
  console.log(`Target: ${targetDir}`);
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory does not exist: ${sourceDir}`);
    process.exit(1);
  }
  
  // 清理目标目录
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log('Cleaned target directory');
  }
  
  // 复制数据
  copyDirectory(sourceDir, targetDir);
  
  console.log('Data copy completed successfully!');
}

main();
