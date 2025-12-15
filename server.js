const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 启用CORS
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 静态文件服务

// 确保上传目录存在
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 处理文件名，避免重名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}${ext}`);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 可以在这里添加文件类型限制
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50000 * 1024 * 1024 // 500MB限制
    }
});

// 获取已上传文件列表
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir).map(filename => {
            const filePath = path.join(uploadDir, filename);
            const stats = fs.statSync(filePath);
            return {
                name: filename,
                size: stats.size,
                uploadTime: stats.birthtime,
                type: getContentType(filename),
                url: `/uploads/${filename}`
            };
        });
        
        res.json({
            success: true,
            files: files.sort((a, b) => b.uploadTime - a.uploadTime)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 单文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '没有上传文件'
            });
        }

        res.json({
            success: true,
            file: {
                name: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype,
                uploadTime: new Date(),
                url: `/uploads/${req.file.filename}`
            }
        });
    } catch (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: '文件过大，最大支持500MB'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 多文件上传
app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: '没有上传文件'
            });
        }

        const uploadedFiles = req.files.map(file => ({
            name: file.filename,
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype,
            uploadTime: new Date(),
            url: `/uploads/${file.filename}`
        }));

        res.json({
            success: true,
            files: uploadedFiles
        });
    } catch (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: '文件过大，单个文件最大支持500MB'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 删除文件
app.delete('/api/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({
                success: true,
                message: '文件删除成功'
            });
        } else {
            res.status(404).json({
                success: false,
                error: '文件不存在'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 清空所有文件
app.delete('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        files.forEach(file => {
            fs.unlinkSync(path.join(uploadDir, file));
        });
        
        res.json({
            success: true,
            message: '所有文件已清空'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取内容类型
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 文件上传服务器已启动!`);
    console.log(`📂 上传目录: ${path.resolve(uploadDir)}`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📁 文件列表: http://localhost:${PORT}/api/files`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});