export function isNotificationActionPath(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || (code >= 127 && code <= 159)
    })
}
