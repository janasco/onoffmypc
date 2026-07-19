'use strict'
/* global document */

const codeInput = document.getElementById('code')
const submitButton = document.getElementById('submit')
const status = document.getElementById('status')

codeInput.addEventListener('input', (e) => {
  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (val.length > 4) {
    val = val.slice(0, 4) + '-' + val.slice(4, 8)
  }
  e.target.value = val
})

function setStatus(message, kind) {
  status.textContent = message
  status.className = kind || ''
}

async function submit() {
  const code = codeInput.value.trim()
  if (!code) {
    setStatus('Enter the pairing code first.', 'error')
    return
  }
  submitButton.disabled = true
  setStatus('Pairing…', '')
  const result = await window.onoffmypc.pair(code)
  submitButton.disabled = false
  if (result.ok) {
    setStatus('Paired. This window will close.', 'ok')
  } else {
    setStatus(result.error || 'Pairing failed.', 'error')
  }
}

submitButton.addEventListener('click', submit)
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submit()
})
