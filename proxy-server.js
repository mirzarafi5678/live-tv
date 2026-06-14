import express from 'express'
import cors from 'cors'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()
const PORT = 3001

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Range', 'Accept-Ranges'],
  credentials: false
}))

// Proxy all requests to the remote server
const proxyOptions = {
  target: 'https://tv.alii.uk',
  changeOrigin: true,
  ws: false,
  onProxyReq: (proxyReq, req, res) => {
    // Set required headers that the streaming server expects
    proxyReq.setHeader('referer', 'https://tv.alii.uk/')
    proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36')
    proxyReq.setHeader('origin', 'https://tv.alii.uk')
    
    // Pass through range requests for streaming
    if (req.headers.range) {
      proxyReq.setHeader('range', req.headers.range)
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers for all responses
    proxyRes.headers['Access-Control-Allow-Origin'] = '*'
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Range, Accept-Ranges'
    proxyRes.headers['Access-Control-Max-Age'] = '86400'
    
    // Preserve content-type for streaming
    if (req.path.includes('.m3u8')) {
      proxyRes.headers['Content-Type'] = 'application/vnd.apple.mpegurl; charset=utf-8'
    } else if (req.path.includes('.ts')) {
      proxyRes.headers['Content-Type'] = 'video/mp2t'
    }
  }
}

// Proxy all paths through to the remote server
app.use('/proxy', createProxyMiddleware(proxyOptions))
app.use('/api', createProxyMiddleware(proxyOptions))

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
})
