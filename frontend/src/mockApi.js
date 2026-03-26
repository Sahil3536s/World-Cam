export const fetchWindyWebcams = async () => {
  try {
    // If the user has a Windy API key in their .env, use it to fetch LIVE CCTV Webcams
    const apiKey = import.meta.env.VITE_WINDY_API_KEY;
    
    if (apiKey) {
      const response = await fetch('https://api.windy.com/webcams/api/v3/webcams?limit=12&include=player', {
        headers: { 'x-windy-key': apiKey }
      });
      const data = await response.json();
      if (data && data.webcams) {
        return data.webcams.map((cam) => ({
          id: cam.webcamId,
          title: cam.title,
          streamUrl: cam.player?.live?.embed || cam.player?.day?.embed || `https://webcams.windy.com/webcams/public/embed/player/${cam.webcamId}?autoplay=1`
        }));
      }
    }
  } catch (error) {
    console.error("Windy API Fetch Error. Falling back to default CCTV list:", error);
  }

  // Fallback to a curated list of live CCTV Windy webcams if no API key is configured
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'AdUw5RdyZxI',
          title: 'CCTV: Times Square',
          streamUrl: 'https://www.youtube.com/embed/AdUw5RdyZxI?autoplay=1&mute=1'
        },
        {
          id: 'HpdO5Kq3o7Y',
          title: 'CCTV: Shibuya Crossing',
          streamUrl: 'https://www.youtube.com/embed/HpdO5Kq3o7Y?autoplay=1&mute=1'
        },
        {
          id: '1B1aYpZEDiU',
          title: 'CCTV: Eiffel Tower',
          streamUrl: 'https://www.youtube.com/embed/1B1aYpZEDiU?autoplay=1&mute=1'
        },
        {
          id: 'NwjN1D0D_G4',
          title: 'CCTV: Abbey Road',
          streamUrl: 'https://www.youtube.com/embed/NwjN1D0D_G4?autoplay=1&mute=1'
        },
        {
          id: 'ph1vpnYIxJk',
          title: 'CCTV: Venice Canal',
          streamUrl: 'https://www.youtube.com/embed/ph1vpnYIxJk?autoplay=1&mute=1'
        },
        {
          id: 'KTwAItMly3o',
          title: 'CCTV: Santorini',
          streamUrl: 'https://www.youtube.com/embed/KTwAItMly3o?autoplay=1&mute=1'
        },
        {
          id: '1EiC9bvVGnk',
          title: 'CCTV: Jackson Hole',
          streamUrl: 'https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&mute=1'
        },
        {
          id: 'xNq93q_qOfY',
          title: 'CCTV: Norway Fjord',
          streamUrl: 'https://www.youtube.com/embed/xNq93q_qOfY?autoplay=1&mute=1'
        }
      ]);
    }, 1000); // Simulate network latency
  });
};
