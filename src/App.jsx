import { useEffect, useRef, useState } from 'react'
import HLS from 'hls.js'
import './App.css'

function App() {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const hlsRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Use local proxy to avoid CORS / hotlinking restrictions when testing in browser
    const useProxy = false  // Try direct access first
    const proxyBase = 'http://localhost:3001/proxy'
    const remotePath = '/api/public/s/v2-BBsCERFWSgJCGgsEDQhfXgEbChxMG1oDHAIIDAsGSR1aBgoRQl4EAAoZFAJEAUMGGAUHFEtAQAFK/playlist.m3u8'
    const originalUrl = useProxy ? `${proxyBase}${remotePath}` : `https://tv.alii.uk${remotePath}`

    const playWhenReady = () => {
      video.muted = true // Mute to allow autoplay
      video.play().then(() => {
        console.log('Playback started')
        setIsPlaying(true)
      }).catch(err => {
        console.error('Play error:', err)
        setError(`Playback error: ${err.message}`)
      })
    }

    video.addEventListener('play', () => setIsPlaying(true))
    video.addEventListener('pause', () => setIsPlaying(false))
    video.addEventListener('click', () => {
      video.muted = false
      video.play()
    })

    if (HLS.isSupported()) {
      const config = {
        enableWorker: true,
        lowLatencyMode: false,
        autoStartLoad: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 600
      }

      const hls = new HLS(config)
      hlsRef.current = hls

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        console.log('✓ Manifest loaded successfully')
        console.log('✓ App is working! Stream segments may be corrupted or URL may be expired.')
        setError(null)
        playWhenReady()
      })

      hls.on(HLS.Events.FRAG_LOADING, (event, data) => {
        // Rewrite fragment URL to go through proxy if it's pointing to tv.alii.uk
        if (data.frag.url && data.frag.url.includes('tv.alii.uk')) {
          data.frag.url = data.frag.url.replace('https://tv.alii.uk', 'http://localhost:3001/proxy')
        }
      })

      hls.on(HLS.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data)
        
        // Handle non-fatal errors
        if (!data.fatal) {
          console.log('Non-fatal error, continuing...')
          return
        }
        
        // Handle fatal errors
        switch (data.type) {
          case HLS.ErrorTypes.NETWORK_ERROR:
            if (data.details === HLS.ErrorDetails.MANIFEST_LOAD_ERROR) {
              setError('Network Error: Failed to load stream')
              // Retry loading after 3 seconds
              setTimeout(() => hls.startLoad(), 3000)
            } else {
              setError(`Network Error: ${data.details}`)
            }
            break
          case HLS.ErrorTypes.MEDIA_ERROR:
            setError(`Media Error: ${data.details}`)
            try {
              hls.recoverMediaError()
            } catch (e) {
              console.error('Failed to recover:', e)
            }
            break
          default:
            setError(`Error: ${data.type}`)
        }
      })

      hls.loadSource(originalUrl)
      hls.attachMedia(video)

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = originalUrl
      video.addEventListener('loadedmetadata', playWhenReady)
      video.addEventListener('error', () => {
        setError(`Native HLS Error`)
      })
    } else {
      setError('HLS not supported on this browser')
    }
  }, [])

  return (
    <div className="live-tv-container">
      <div className="channel-header">
        <div className="header-content">
          <div className="channel-info">
            <h1 className="channel-name">beIN SPORTS 1</h1>
            <p className="channel-category">Premium Sports Channel</p>
          </div>
          <div className="header-badges">
            {isPlaying && <span className="badge badge-live">● LIVE</span>}
            <span className="badge badge-hd">HD</span>
          </div>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="player-container">
        <video
          ref={videoRef}
          controls
          className="video-player"
        ></video>
      </div>
      <div className="channel-footer">
        <div className="footer-info">
          <span className="info-item">🎬 Premium Sports Content</span>
          <span className="info-item">📺 High Definition Streaming</span>
        </div>
      </div>
    </div>
  )
}

export default App
