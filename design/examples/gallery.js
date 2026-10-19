(function () {
  const root = document.documentElement
  const status = document.getElementById('preferences-status')
  const announce = (message) => { if (status) status.textContent = message }

  const STORAGE_KEYS = {
    theme: 'onoffmypc-design-theme',
    contrast: 'onoffmypc-design-contrast',
    motion: 'onoffmypc-design-motion',
    forcedColors: 'onoffmypc-design-forced-colors',
  }

  // Theme: system | light | dark
  const themeButtons = document.querySelectorAll('[data-theme-choice]')
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'system'

  function applyTheme(choice, { persist, announceChange } = {}) {
    if (choice === 'system') delete root.dataset.theme
    else root.dataset.theme = choice
    themeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === choice))
    })
    if (persist) localStorage.setItem(STORAGE_KEYS.theme, choice)
    if (announceChange) announce(`Theme set to ${choice}.`)
  }

  themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.themeChoice, { persist: true, announceChange: true })
    })
  })

  applyTheme(storedTheme)

  // Boolean toggles: contrast, motion, forced-colors preview
  const toggles = [
    {
      id: 'contrast-toggle',
      storageKey: STORAGE_KEYS.contrast,
      attribute: 'contrast',
      onValue: 'more',
      label: 'More contrast',
    },
    {
      id: 'forced-colors-toggle',
      storageKey: STORAGE_KEYS.forcedColors,
      attribute: 'forcedColors',
      onValue: 'preview',
      label: 'System colors preview',
    },
    {
      id: 'motion-toggle',
      storageKey: STORAGE_KEYS.motion,
      attribute: 'motion',
      onValue: 'reduce',
      label: 'Reduced motion',
    },
  ]

  toggles.forEach(({ id, storageKey, attribute, onValue, label }) => {
    const button = document.getElementById(id)
    if (!button) return

    function apply(enabled, { persist, announceChange } = {}) {
      if (enabled) root.dataset[attribute] = onValue
      else delete root.dataset[attribute]
      button.setAttribute('aria-pressed', String(enabled))
      if (persist) localStorage.setItem(storageKey, String(enabled))
      if (announceChange) announce(`${label} ${enabled ? 'enabled' : 'disabled'}.`)
    }

    button.addEventListener('click', () => {
      apply(button.getAttribute('aria-pressed') !== 'true', { persist: true, announceChange: true })
    })

    apply(localStorage.getItem(storageKey) === 'true')
  })
})()
