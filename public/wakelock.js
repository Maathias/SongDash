// The wake lock sentinel.
let wakeLock = null

// Function that attempts to request a wake lock.
const requestWakeLock = async () => {
	try {
		wakeLock = await navigator.wakeLock.request('screen')
		wakeLock.addEventListener('release', () => {
			console.log('Wake Lock was released')
		})
		console.log('Wake Lock is active')
	} catch (err) {
		console.error(`${err.name}, ${err.message}`)
	}
}

// Function that attempts to release the wake lock.
const releaseWakeLock = async () => {
	if (!wakeLock) {
		return
	}
	try {
		await wakeLock.release()
		wakeLock = null
	} catch (err) {
		console.error(`${err.name}, ${err.message}`)
	}
}
