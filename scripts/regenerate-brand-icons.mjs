import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const svg = readFileSync('public/logo-leadsghr-1024x1024.svg', 'utf8')
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } }).render().asPng()
writeFileSync('apps/desktop/resources/leadsghr-icon.png', png)
writeFileSync('apps/desktop/resources/leadsghr-icon.ico', await pngToIco(png))
