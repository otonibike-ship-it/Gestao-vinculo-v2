'use client'

import { useState } from 'react'
import { FileText, X } from 'lucide-react'

interface AnexosGridProps {
  anexos: string[] | null | undefined
  titulo?: string
}

export function AnexosGrid({ anexos, titulo = 'Anexos' }: AnexosGridProps) {
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)

  if (!anexos || anexos.length === 0) return null

  return (
    <>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{titulo}</p>
        <div className="space-y-2">
          {anexos.map((anexo, i) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo)
            const isPdf = /\.pdf$/i.test(anexo)
            return (
              <div key={i} className="border border-slate-200 rounded-lg overflow-hidden hover:border-brand-teal hover:shadow-md transition-all">
                {isImage ? (
                  <a href={anexo} target="_blank" rel="noopener noreferrer" className="block group cursor-pointer">
                    <div className="relative">
                      <img src={anexo} alt={`Anexo ${i + 1}`} className="w-full max-h-48 object-contain bg-slate-50" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full shadow transition-opacity">
                          Abrir em nova aba
                        </span>
                      </div>
                    </div>
                  </a>
                ) : isPdf ? (
                  <button
                    type="button"
                    onClick={() => setPdfViewerUrl(anexo)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-pine hover:bg-brand-teal/10 transition-colors text-left"
                  >
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate">{anexo.split('/').pop()}</span>
                  </button>
                ) : (
                  <a href={anexo} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-brand-pine hover:bg-brand-teal/10 transition-colors"
                  >
                    <FileText size={16} />
                    {anexo.split('/').pop()}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {pdfViewerUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setPdfViewerUrl(null)}
        >
          <div
            className="w-full max-w-4xl flex flex-col rounded-xl overflow-hidden shadow-2xl"
            style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Documento</span>
              <div className="flex items-center gap-4">
                <a
                  href={pdfViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-pine hover:text-brand-forest font-medium"
                >
                  Baixar arquivo ↓
                </a>
                <button onClick={() => setPdfViewerUrl(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
            </div>
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfViewerUrl)}&embedded=true`}
              className="flex-1 w-full border-0 bg-white"
              title="PDF"
            />
          </div>
        </div>
      )}
    </>
  )
}
