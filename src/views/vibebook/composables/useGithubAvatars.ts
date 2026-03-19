import { ref } from 'vue'

const AVATAR_COLORS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#818cf8',
  '#c084fc',
  '#f472b6',
]

/**
 * useGithubAvatar — returns GitHub avatar URL using the `.png` trick
 * (https://github.com/{username}.png) which avoids API calls and rate limits.
 *
 * For non-GitHub usernames or failed loads, falls back to a colored initial avatar.
 */
export function useGithubAvatar(author: string) {
  const isLikelyGitHubUsername = /^[a-zA-Z0-9-]+$/.test(author)

  const avatarUrl = ref(isLikelyGitHubUsername ? `https://github.com/${author}.png` : null)

  function onAvatarError() {
    avatarUrl.value = null
  }

  const avatarColor = (() => {
    let hash = 0
    for (let i = 0; i < author.length; i++) {
      hash = author.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
  })()

  const initial = author.charAt(0).toUpperCase()

  return { avatarUrl, avatarColor, initial, onAvatarError }
}
