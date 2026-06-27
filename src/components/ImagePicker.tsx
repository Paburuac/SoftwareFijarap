import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface Props {
  value: string   // base64 data URL o ''
  onChange: (dataUrl: string) => void
  size?: 'sm' | 'md'
}

export default function ImagePicker({ value, onChange, size = 'md' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      // Redimensionar si es muy grande (max 800px)
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        onChange(canvas.toDataURL('image/webp', 0.85))
      }
      img.src = result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const dim = size === 'sm' ? 'w-10 h-10' : 'w-24 h-24'
  const iconSize = size === 'sm' ? 16 : 28

  return (
    <div className="relative inline-block">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {value ? (
        <div className={`relative ${dim} rounded-lg overflow-hidden border border-[var(--border)] group cursor-pointer`}
          onClick={() => inputRef.current?.click()}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ImagePlus size={iconSize} className="text-white" />
          </div>
          <button
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="absolute top-0.5 right-0.5 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} className="text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`${dim} rounded-lg border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 hover:border-primary-500 hover:bg-primary-500/5 transition-colors`}
          style={{ color: 'var(--text-muted)' }}
        >
          <ImagePlus size={iconSize} />
          {size === 'md' && <span className="text-xs">Imagen</span>}
        </button>
      )}
    </div>
  )
}
