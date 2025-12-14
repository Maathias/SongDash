// SETUP
const statuses = {
	paused: '<i class="icon-pause-circled"></i>',
	playing: '<i class="icon-play-circled"></i>',
	waiting: '<i class="icon-stop-circled"></i>',
}

const nodeStatus = document.querySelector('#status'),
	nodeQueue = document.querySelector('#queue'),
	nodeScore = document.querySelector('#scoreboard'),
	nodeQrModal = document.querySelector('#qr-modal')

const socket = new Socket('tv')

var localStatus = 'waiting',
	localQueue = [],
	localActive = 0

function setStatus(status = 'waiting') {
	const patternColors = {
		playing: { fg: '#18dd5c', bg: '#1bc957' },
		paused: { fg: '#82abdd', bg: '#88b2e3' },
		waiting: { fg: '#9e82dd', bg: '#ab91e5' },
	}

	console.info('status', status)

	nodeStatus.innerHTML = statuses[status]
	document.body.style.setProperty('--fgcolor', patternColors[status].fg)
	document.body.style.setProperty('--bgcolor', patternColors[status].bg)
}

function setQueue(queue, active = 0) {
	nodeQueue.innerHTML = queue
		.map((nick, i) => `<div class="nick ${i == active ? 'active' : ''}">${nick}</div>`)
		.join('')
}

function showQrModal(show = true) {
	if (show) nodeQrModal.classList.add('show')
	else nodeQrModal.classList.remove('show')
}

function setScoreboard(scoreboard) {
	const sorted = [...scoreboard].sort((a, b) => b.score - a.score)

	const icon = '<i class="icon-award-1"></i>'

	nodeScore.innerHTML = sorted
		.map((player, i) => {
			return `<div class="item">
						<span class="rank">${i < 3 ? icon : `#${i + 1}`}</span>
						<span class="nick">${player.nick || '---'}</span>
						<span class="score">${player.score}</span>
					</div>`
		})
		.join('')
}

// Initialize
requestWakeLock()
setStatus()

socket.on('update', ({ board, active, queue, status }) => {
	setQueue(queue, active)
	setStatus(status)
	setScoreboard(board)
})

socket.on('showQr', data => {
	showQrModal(data.show)
})
