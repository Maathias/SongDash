const socket = new Socket('player')

requestWakeLock()

// Cache DOM elements
const nodeButton = document.querySelector('button'),
	nodeNick = document.querySelector('#nick'),
	nodePoints = document.querySelector('#points')

// Initialize nickname
const savedNick = localStorage.getItem('nick') || ''
nodeNick.value = savedNick
socket.player('setNick', { nick: savedNick })

// Handle button press
nodeButton.addEventListener('mousedown', () => socket.player('enter'))
nodeButton.addEventListener('touchstart', () => socket.player('enter'), { passive: true })

// Handle nickname changes
const setNick = e => {
	const nick = e.target.value.trim().toLowerCase()
	socket.player('setNick', { nick })
	localStorage.setItem('nick', nick)
}

nodeNick.addEventListener('change', setNick)

// // Update points display using custom event listener
// socket.on('points', points => {
//   nodePoints.textContent = points
// })
