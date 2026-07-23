/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de marca SenseBike
        brand: {
          forest: '#18301A',   // verde quase preto — sidebar, texto de maior contraste
          pine:   '#26745E',   // verde-azulado escuro — cor primária (botões, ações, links)
          teal:   '#64BFB6',   // verde-azulado claro — status secundário, hover, foco
          olive:  '#91AF35',   // verde-oliva — sucesso/aprovação, destaques
          lime:   '#B8FF01',   // verde-limão vibrante — realces pontuais (nunca em área grande)
          khaki:  '#948540',   // caqui — aguardando/atenção
          umber:  '#5B5127',   // caqui escuro — texto sobre fundo caqui
          mist:   '#EBF0F3',   // quase-branco — fundo de página
        },
        sidebar: {
          DEFAULT: '#18301A',
          hover: '#26745E',
          active: '#26745E',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
