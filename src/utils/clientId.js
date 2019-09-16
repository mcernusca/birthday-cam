export default function generateClientId() {
  const id =
    'client-' +
    Math.random()
      .toString(36)
      .substr(2, 16)

  return id
}
