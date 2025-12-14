// Create socket and expose globally for inline onclick handlers
window.socket = new Socket('host')

const artistElement = document.querySelector('#artist')
const trackElement = document.querySelector('#track')

// Use custom event listener for metadata updates
socket.on('metadata', metadata => {
	artistElement.textContent = metadata.author
	trackElement.textContent = metadata.track
})
