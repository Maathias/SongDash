const socket = new Socket('debug')

socket.on('update', data => {
	updateDebug(data)
})

function updateDebug(data) {
	// Update timestamp
	document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleTimeString()

	// Update Music Status
	const musicStatus = document.getElementById('music-status')
	musicStatus.textContent = data.music.status
	musicStatus.className = 'status ' + data.music.status

	document.getElementById('music-platform').textContent = data.music.platform || '--'
	document.getElementById('music-listeners').textContent = data.music.listenerCount

	if (data.music.metadata && data.music.metadata.author && data.music.metadata.track) {
		const metadataText = `${data.music.metadata.author} - ${data.music.metadata.track}`
		document.getElementById('music-metadata-author').textContent = metadataText
		document.getElementById('music-metadata-track').textContent = ''
	} else {
		document.getElementById('music-metadata-author').textContent = '--'
		document.getElementById('music-metadata-track').textContent = ''
	}

	// Update Queue
	document.getElementById('queue-length').textContent = data.queue.length
	const queueBody = document.getElementById('queue-body')

	if (data.queue.queue.length === 0) {
		queueBody.innerHTML = '<tr><td colspan="4" class="empty">No players in queue</td></tr>'
	} else {
		queueBody.innerHTML = data.queue.queue
			.map(
				item => `
			<tr>
				<td>${item.position + 1}</td>
				<td>${item.ip}</td>
				<td>${item.nick || '--'}</td>
				<td>${item.isActive ? '<span class="status active">ACTIVE</span>' : ''}</td>
			</tr>
		`
			)
			.join('')
	}

	// Update Scoreboard
	document.getElementById('board-total').textContent = data.board.totalPlayers
	const boardBody = document.getElementById('board-body')

	if (data.board.scores.length === 0) {
		boardBody.innerHTML = '<tr><td colspan="4" class="empty">No scores recorded</td></tr>'
	} else {
		boardBody.innerHTML = data.board.scores
			.map(
				item => `
			<tr>
				<td>${item.ip}</td>
				<td>${item.nick}</td>
				<td>${item.score}</td>
				<td><span class="status ${item.connected ? 'connected' : 'disconnected'}">${
					item.connected ? 'YES' : 'NO'
				}</span></td>
			</tr>
		`
			)
			.join('')
	}

	// Update Clients
	document.getElementById('client-count').textContent = data.client.clients.length
	const clientBody = document.getElementById('client-body')

	if (data.client.clients.length === 0) {
		clientBody.innerHTML = '<tr><td colspan="4" class="empty">No clients connected</td></tr>'
	} else {
		// Sort clients: special types (tv, host, debug) first, then players
		const specialTypes = ['tv', 'host', 'debug']
		const sortedClients = [...data.client.clients].sort((a, b) => {
			const aSpecial = specialTypes.includes(a.type)
			const bSpecial = specialTypes.includes(b.type)
			if (aSpecial && !bSpecial) return -1
			if (!aSpecial && bSpecial) return 1
			return 0
		})

		clientBody.innerHTML = sortedClients
			.map(item => {
				let uaDisplay = '--'
				let uaTitle = '--'
				if (item.userAgent) {
					uaDisplay = `${item.userAgent.browser || 'Unknown'} / ${item.userAgent.os || 'Unknown'} / ${
						item.userAgent.device
					}`
					uaTitle = item.userAgent.raw
				}
				const typeClass = specialTypes.includes(item.type) ? `type-${item.type}` : ''
				return `
			<tr>
				<td>${item.ip}</td>
				<td class="${typeClass}">${item.type || '--'}</td>
				<td>${item.nick || '--'}</td>
				<td title="${uaTitle}">${uaDisplay}</td>
			</tr>
			`
			})
			.join('')
	}
}
