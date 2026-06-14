import { useEffect, useRef, useState } from 'react'
import HLS from 'hls.js'
import './App.css'

function App() {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedChannel, setSelectedChannel] = useState('bein1')
  const hlsRef = useRef(null)
  const [theater, setTheater] = useState(false)

  // Minimal program guide: only beIN SPORTS 1
  const channels = {
    bein1: { name: 'beIN SPORTS 1', category: 'Sports', color: '#ff0000' }
  }

  // Programs removed per request (no schedule shown)
  const programs = {
    bein1: []
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

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
    <div className={`live-tv-container ${theater ? 'theater' : ''}`}>
      <div className="tv-header">
        <div className="tv-logo">📺 LIVE TV</div>
        <div className="tv-time">{currentTime.toLocaleTimeString()}</div>
      </div>

      <div className="tv-main-content">
        {/* Left Sidebar - Channel Guide */}
        <div className="tv-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">CHANNELS</h3>
            <div className="channel-list">
              {Object.entries(channels).map(([key, ch]) => (
                <button
                  key={key}
                  className={`channel-btn ${selectedChannel === key ? 'active' : ''}`}
                  onClick={() => setSelectedChannel(key)}
                  style={{
                    borderLeftColor: selectedChannel === key ? ch.color : 'transparent'
                  }}
                >
                  <span className="ch-number">{key.toUpperCase()}</span>
                  <div className="ch-info">
                    <div className="ch-name">{ch.name}</div>
                    <div className="ch-category">{ch.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Main Player */}
        <div className="tv-player-section">
          <div className="player-wrapper">
            <div className="player-container">
              <video
                ref={videoRef}
                controls
                className="video-player"
              ></video>
              {!isPlaying && (
                <div className="play-overlay">
                  <div className="play-button">▶</div>
                </div>
              )}
            </div>

            {/* Overlay info */}
            <div className="player-overlay">
              <div className="overlay-content">
                <span className={`badge badge-live ${isPlaying ? 'active' : ''}`}>
                  ● LIVE
                </span>
                <span className="badge badge-hd">HD</span>
                <span className="badge badge-4k">4K READY</span>
                
              </div>
            </div>

            {error && (
              <div className="error-message">{error}</div>
            )}
          </div>

          {/* Current Program Info */}
          <div className="program-info">
            <div className="program-header">
              <h2 className="program-title">
                {programs[selectedChannel]?.[0]?.title || 'Live TV'}
              </h2>
              <span className="program-time">
                {programs[selectedChannel]?.[0]?.time || 'Now Showing'}
              </span>
            </div>
            <p className="program-description">
              {programs[selectedChannel]?.[0]?.description || 'Premium content stream'}
            </p>
          </div>
        </div>

        {/* Right Sidebar - EPG */}
        <div className="tv-epg">
          <div className="epg-section">
            <h3 className="epg-title">SCHEDULE</h3>
            <div className="epg-list">
              {programs[selectedChannel]?.map((prog, idx) => (
                <div key={idx} className={`epg-item ${idx === 0 ? 'current' : 'next'}`}>
                  <div className="epg-time">{prog.time}</div>
                  <div className="epg-program">
                    <div className="epg-title">{prog.title}</div>
                    <div className="epg-desc">{prog.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
