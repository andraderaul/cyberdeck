export function loadImageFile(
  file: File,
  onLoad: (img: HTMLImageElement) => void,
  onError?: (message: string) => void,
): void {
  if (!file.type.startsWith('image/')) {
    return
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    URL.revokeObjectURL(url)
    onLoad(img)
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    onError?.('Failed to load image')
  }
  img.src = url
}
